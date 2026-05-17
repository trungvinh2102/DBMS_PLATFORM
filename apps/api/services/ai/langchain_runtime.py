"""
langchain_runtime.py

LangChain, LangGraph, and LangSmith integration helpers for QurioDB AI services.
This module centralizes optional imports, model construction, tracing metadata,
and message conversion so route/service code can stay focused on product logic.
"""

import logging
import os
from typing import Any, Dict, Iterable, List, Optional

try:
    from langchain_core.messages import AIMessage, BaseMessage, HumanMessage, SystemMessage
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_openai import ChatOpenAI

    HAS_LANGCHAIN = True
except ImportError:
    AIMessage = None
    BaseMessage = Any
    HumanMessage = None
    SystemMessage = None
    ChatGoogleGenerativeAI = None
    ChatOpenAI = None
    HAS_LANGCHAIN = False

try:
    from langchain_anthropic import ChatAnthropic

    HAS_ANTHROPIC = True
except ImportError:
    ChatAnthropic = None
    HAS_ANTHROPIC = False

try:
    from langgraph.graph import END, START, StateGraph

    HAS_LANGGRAPH = True
except ImportError:
    END = None
    START = None
    StateGraph = None
    HAS_LANGGRAPH = False

try:
    from langsmith import traceable

    HAS_LANGSMITH = True
except ImportError:
    traceable = None
    HAS_LANGSMITH = False

from models.metadata import AIModel, SessionLocal, UserAIConfig
from routes.ai_config import decrypt_key

logger = logging.getLogger(__name__)

DEFAULT_LANGSMITH_PROJECT = "QurioDB AI Assistant"
OPENAI_COMPATIBLE_BASE_URLS = {
    "deepseek": "https://api.deepseek.com",
    "qwen": "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
}
DEFAULT_PROVIDER_MODELS = {
    "openai": "gpt-4o-mini",
    "google": "gemini-2.5-flash",
    "anthropic": "claude-3-5-haiku-latest",
    "qwen": "qwen-plus",
    "deepseek": "deepseek-chat",
}
SUPPORTED_PROVIDERS = tuple(DEFAULT_PROVIDER_MODELS.keys())

def _read_user_ai_config(user_id: Optional[str]) -> Dict[str, Optional[str]]:
    """Reads user-scoped provider and API key settings when available."""
    if not user_id:
        return {"api_key": None, "provider": None}

    session = SessionLocal()
    try:
        config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
        if config:
            return {
                "api_key": decrypt_key(config.apiKey) if config.apiKey else None,
                "provider": config.provider,
            }
    except Exception as exc:
        logger.warning("Failed to load user AI key for LangChain: %s", exc)
    finally:
        session.close()

    return {"api_key": None, "provider": None}


def _read_provider_ai_config(provider: str, user_id: Optional[str] = None) -> Dict[str, Optional[str]]:
    """Reads the encrypted DB key for the requested provider."""
    normalized_provider = normalize_provider(provider)
    session = SessionLocal()
    try:
        query = session.query(UserAIConfig)
        if user_id:
            query = query.filter(UserAIConfig.userId == user_id)

        configs = query.all()
        for config in configs:
            if normalize_provider(config.provider) != normalized_provider:
                continue
            return {
                "api_key": decrypt_key(config.apiKey) if config.apiKey else None,
                "provider": config.provider,
            }
    except Exception as exc:
        logger.warning("Failed to load %s AI key from DB: %s", normalized_provider, exc)
    finally:
        session.close()

    return {"api_key": None, "provider": None}


def get_ai_api_key(user_id: Optional[str] = None, provider: Optional[str] = None) -> Optional[str]:
    """Returns the active provider API key from encrypted DB settings."""
    normalized_provider = normalize_provider(provider)
    provider_config = _read_provider_ai_config(normalized_provider, user_id)
    if provider_config.get("api_key"):
        return provider_config["api_key"]

    user_config = _read_user_ai_config(user_id)
    if normalize_provider(user_config.get("provider")) == normalized_provider and user_config.get("api_key"):
        return user_config["api_key"]
    return None


def normalize_provider(provider: Optional[str]) -> str:
    """Normalizes provider labels from UI, DB, and model names."""
    value = (provider or "Google").strip().lower()
    aliases = {
        "google gemini": "google",
        "gemini": "google",
        "open ai": "openai",
        "claude": "anthropic",
        "anthripic": "anthropic",
        "alibaba qwen": "qwen",
    }
    return aliases.get(value, value)


def is_google_provider(provider: Optional[str]) -> bool:
    """Returns true when a provider should use Google's native Gemini fallback."""
    return normalize_provider(provider) == "google"


def infer_provider_from_model_id(model_id: Optional[str]) -> str:
    """Best-effort provider inference for OpenAI-compatible model IDs."""
    value = (model_id or "").lower()
    if value.startswith(("gpt-", "o1", "o3", "o4", "gpt-5")):
        return "openai"
    if value.startswith(("claude-", "anthropic.")):
        return "anthropic"
    if "gemini" in value:
        return "google"
    if "deepseek" in value:
        return "deepseek"
    if "qwen" in value:
        return "qwen"
    return "google"


def ensure_langsmith_environment() -> None:
    """
    Keeps LangSmith configuration predictable.

    Tracing remains opt-in via LANGSMITH_TRACING=true. When tracing is enabled,
    QurioDB sets a stable project name unless the user has already chosen one.
    """
    if not os.getenv("LANGSMITH_PROJECT") and not os.getenv("LANGCHAIN_PROJECT"):
        os.environ["LANGSMITH_PROJECT"] = DEFAULT_LANGSMITH_PROJECT


def langsmith_metadata(user_id: Optional[str] = None, db_id: Optional[str] = None) -> Dict[str, str]:
    """Builds low-cardinality trace metadata for LangSmith runs."""
    metadata = {"app": "quriodb", "component": "ai-assistant"}
    if user_id:
        metadata["user_id"] = user_id
    if db_id:
        metadata["database_id"] = db_id
    return metadata


class LangChainRuntime:
    """Small adapter around LangChain chat models and LangSmith trace settings."""

    def __init__(self, default_model: str = "gemini-2.5-flash"):
        self.default_model = default_model
        ensure_langsmith_environment()

    @property
    def is_available(self) -> bool:
        return HAS_LANGCHAIN

    @property
    def is_graph_available(self) -> bool:
        return HAS_LANGGRAPH

    @property
    def is_langsmith_available(self) -> bool:
        return HAS_LANGSMITH

    def resolve_provider(self, model_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """Resolves provider from model registry, user settings, then model-id heuristics."""
        if model_id:
            session = SessionLocal()
            try:
                model = session.query(AIModel).filter(AIModel.modelId == model_id).first()
                if model and model.provider:
                    return normalize_provider(model.provider)
            except Exception as exc:
                logger.debug("Failed to resolve AI model provider: %s", exc)
            finally:
                session.close()

        user_provider = _read_user_ai_config(user_id).get("provider")
        if user_provider:
            return normalize_provider(user_provider)
        return infer_provider_from_model_id(model_id)

    def status(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """Reports local AI integration readiness without exposing secrets."""
        providers = {}
        for provider in SUPPORTED_PROVIDERS:
            providers[provider] = {"hasApiKey": bool(get_ai_api_key(user_id, provider))}

        return {
            "langchain": HAS_LANGCHAIN,
            "langgraph": HAS_LANGGRAPH,
            "langsmith": HAS_LANGSMITH,
            "anthropic": HAS_ANTHROPIC,
            "supportedProviders": list(SUPPORTED_PROVIDERS),
            "defaultModels": DEFAULT_PROVIDER_MODELS,
            "hasApiKey": any(item["hasApiKey"] for item in providers.values()),
            "providers": providers,
            "tracingEnabled": os.getenv("LANGSMITH_TRACING", "").lower() == "true",
            "project": os.getenv("LANGSMITH_PROJECT") or os.getenv("LANGCHAIN_PROJECT"),
        }

    def build_model(
        self,
        model_id: Optional[str] = None,
        user_id: Optional[str] = None,
        provider: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ):
        """Creates a provider chat model using OpenAI-compatible message semantics."""
        if not HAS_LANGCHAIN:
            raise RuntimeError("LangChain chat integrations are not installed")

        target_provider = normalize_provider(provider or self.resolve_provider(model_id, user_id))
        target_model = model_id or DEFAULT_PROVIDER_MODELS.get(target_provider, self.default_model)

        api_key = get_ai_api_key(user_id, target_provider)
        if not api_key:
            raise RuntimeError(f"Missing {target_provider} API key. Configure environment variables or AI Settings.")

        kwargs: Dict[str, Any] = {"model": target_model, "temperature": temperature, "max_retries": 2}
        if max_tokens is not None:
            kwargs["max_tokens"] = max_tokens

        if target_provider == "google":
            return ChatGoogleGenerativeAI(api_key=api_key, **kwargs)

        if target_provider == "anthropic":
            if not HAS_ANTHROPIC:
                raise RuntimeError("Anthropic integration is not installed")
            return ChatAnthropic(api_key=api_key, **kwargs)

        if target_provider in {"qwen", "deepseek"}:
            base_url = os.getenv(f"{target_provider.upper()}_BASE_URL") or OPENAI_COMPATIBLE_BASE_URLS[target_provider]
            return ChatOpenAI(api_key=api_key, base_url=base_url, **kwargs)

        return ChatOpenAI(api_key=api_key, **kwargs)

    def make_messages(self, system_prompt: str, prompt: str, history: Optional[List[Dict[str, str]]] = None) -> List[BaseMessage]:
        """Converts QurioDB conversation records into LangChain chat messages."""
        if not HAS_LANGCHAIN:
            raise RuntimeError("LangChain is not installed")

        messages: List[BaseMessage] = [SystemMessage(content=system_prompt)]
        for item in history or []:
            role = item.get("role")
            content = item.get("content") or ""
            if not content:
                continue
            if role == "assistant":
                messages.append(AIMessage(content=content))
            else:
                messages.append(HumanMessage(content=content))

        messages.append(HumanMessage(content=prompt))
        return messages

    def invoke_text(
        self,
        system_prompt: str,
        prompt: str,
        model_id: Optional[str] = None,
        user_id: Optional[str] = None,
        provider: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        db_id: Optional[str] = None,
        temperature: float = 0.2,
        max_tokens: Optional[int] = None,
    ) -> str:
        """Invokes a LangChain chat model and returns normalized text content."""
        model = self.build_model(model_id, user_id=user_id, provider=provider, temperature=temperature, max_tokens=max_tokens)
        messages = self.make_messages(system_prompt, prompt, history=history)
        config = {"metadata": langsmith_metadata(user_id=user_id, db_id=db_id)}
        response = model.invoke(messages, config=config)
        return normalize_message_content(response.content)

    def stream_text(
        self,
        system_prompt: str,
        prompt: str,
        model_id: Optional[str] = None,
        user_id: Optional[str] = None,
        provider: Optional[str] = None,
        history: Optional[List[Dict[str, str]]] = None,
        db_id: Optional[str] = None,
    ) -> Iterable[str]:
        """Streams normalized text chunks from a LangChain chat model."""
        model = self.build_model(model_id, user_id=user_id, provider=provider, temperature=0.2)
        messages = self.make_messages(system_prompt, prompt, history=history)
        config = {"metadata": langsmith_metadata(user_id=user_id, db_id=db_id)}
        for chunk in model.stream(messages, config=config):
            text = normalize_message_content(getattr(chunk, "content", ""))
            if text:
                yield text


def normalize_message_content(content: Any) -> str:
    """Normalizes provider-specific LangChain content blocks into display text."""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for block in content:
            if isinstance(block, str):
                parts.append(block)
            elif isinstance(block, dict):
                text = block.get("text") or block.get("thinking") or ""
                if text:
                    parts.append(str(text))
        return "".join(parts)
    return str(content or "")


langchain_runtime = LangChainRuntime()
