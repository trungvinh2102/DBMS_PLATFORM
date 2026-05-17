"""
ai_service.py

Specialized AI service delegator that coordinates multiple AI strategies
(SQL tasks, Agents, Semantic Context) for QurioDB.
"""
import logging
import json
from typing import Dict, Any, Optional

from .ai.sql import SqlAIService
from .ai.agent import AgentAIService
from .ai.context import schema_context_service
from .ai.feedback_context import feedback_context_service
from .ai.langchain_runtime import is_google_provider, langchain_runtime
from .ai.stream_parser import TaggedResponseStreamParser

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

logger = logging.getLogger(__name__)

class AIService(SqlAIService, AgentAIService):
    """
    Primary AI service delegator.
    Inherits from specialized services and uses common schema_context utilities.
    """

    def __init__(self):
        super().__init__()
        # Additional startup logic if needed
        logger.info("AIService initialized with multi-strategy delegation.")

    # --- Schema Context methods (Delegated to schema_context_service) ---
    
    def _format_schema_context(self, db_id: str, schema: str, intent: Optional[str] = None) -> str:
        """Proxies schema context formatting to the specialized context service."""
        return schema_context_service.format_schema_context(db_id, schema, intent=intent)

    # --- Autocomplete Task ---

    def autocomplete_sql(self, db_id: str, schema: str, prefix: str, suffix: str, user_id: Optional[str] = None, model_id: Optional[str] = None) -> Dict[str, Any]:
        """Provides fast inline SQL autocomplete using Gemini."""
        context = self._format_schema_context(db_id, schema, intent=f"{prefix} ... {suffix}")
        
        system_instruction = (
            "You are a fast, precise SQL coding assistant for inline autocomplete.\n"
            f"Here is the database schema context:\n{context}\n\n"
            "INSTRUCTIONS:\n"
            "1. Predict ONLY the missing text connecting prefix and suffix.\n"
            "2. DO NOT repeat prefix/suffix. DO NOT output markdown.\n"
            "3. If no confident completion, return empty."
        )
        
        prompt = f"PREFIX:\n{prefix}\n\nSUFFIX:\n{suffix}\n\nCOMPLETION:"
        provider = langchain_runtime.resolve_provider(model_id=model_id, user_id=user_id)
        try:
            completion = langchain_runtime.invoke_text(
                system_prompt=system_instruction,
                prompt=prompt,
                model_id=model_id,
                user_id=user_id,
                provider=provider,
                db_id=db_id,
                temperature=0.1,
                max_tokens=128,
            )
            return {"completion": self._clean_sql_code(completion)}
        except Exception as langchain_error:
            logger.warning("LangChain autocomplete failed for provider %s: %s", provider, langchain_error)

        if not is_google_provider(provider):
            return {"completion": "", "error": f"LangChain autocomplete failed for provider {provider}"}

        try:
            if not HAS_GENAI:
                return {"completion": "", "error": "AI provider packages are not installed"}
            model = genai.GenerativeModel(
                model_name=model_id or "gemini-2.5-flash",
                system_instruction=system_instruction,
                generation_config={"temperature": 0.1, "max_output_tokens": 128}
            )
            response = model.generate_content(prompt)
            completion = self._clean_sql_code(response.text) if response and response.text else ""
            return {"completion": completion}
        except Exception as e:
            logger.error(f"Autocomplete failed: {e}")
            return {"completion": "", "error": str(e)}

    def _clean_sql_code(self, completion: str) -> str:
        """Helper to clean autocomplete text."""
        completion = completion.strip()
        if completion.startswith("```"):
            completion = completion.replace("```sql\n", "").replace("```sql", "").replace("```\n", "").replace("```", "").strip()
        return completion

    # --- Streaming Logic ---

    def stream_generate_response(self, prompt: str, db_id: Optional[str] = None, schema: str = "public", model_id: Optional[str] = None, user_id: Optional[str] = None, history: Optional[list] = None, conv_id: Optional[str] = None):
        """Streams responses for chat interfaces using SSE events."""
        # Yield clean text. Frontend will handle wrapping for the UI steps.
        yield "thinking", "Initializing context..."
        
        system_prompt = "You are the Supreme SQL Architect. Use English for reasoning steps but respond in the user's language."
        if db_id:
            yield "thinking", "Analyzing schema..."
            
            # Yield tool call metadata as JSON
            retrieval_intent = self._rewrite_retrieval_intent(prompt, history or [])
            yield "tool_call", json.dumps({"name": "SchemaContextLoader", "args": {"databaseId": db_id, "intent": retrieval_intent}}, ensure_ascii=False)
            
            context_result = schema_context_service.build_schema_context(db_id, schema, intent=retrieval_intent)
            context = context_result.context
            if context_result.retrieval_trace.get("tables"):
                yield "tool_call", json.dumps({
                    "name": "RetrievalTrace",
                    "args": context_result.retrieval_trace,
                }, ensure_ascii=False)
            
            # Fetch feedback context if user_id is available
            feedback = ""
            if user_id:
                yield "thinking", "Learning from your feedback..."
                feedback = feedback_context_service.get_feedback_context(db_id, user_id)

            from .prompts import get_sql_generation_prompt
            system_prompt = get_sql_generation_prompt(context, feedback_context=feedback)
            yield "thinking", "Sẵn sàng."
        else:
            yield "thinking", "Khởi tạo xong."

        try:
            langchain_history = history or []
            if conv_id and not langchain_history:
                langchain_history = self._load_langchain_history(conv_id)

            provider = langchain_runtime.resolve_provider(model_id=model_id, user_id=user_id)
            parser = TaggedResponseStreamParser()
            for chunk in langchain_runtime.stream_text(
                system_prompt=system_prompt,
                prompt=prompt,
                db_id=db_id,
                model_id=model_id,
                user_id=user_id,
                provider=provider,
                history=langchain_history,
            ):
                for event, parsed_chunk in parser.feed(chunk):
                    yield event, parsed_chunk
            for event, parsed_chunk in parser.flush():
                yield event, parsed_chunk
            return
        except Exception as langchain_error:
            logger.warning("LangChain streaming failed: %s", langchain_error)

        provider = langchain_runtime.resolve_provider(model_id=model_id, user_id=user_id)
        if not is_google_provider(provider):
            yield "error", f"LangChain streaming failed for provider {provider}"
            return

        try:
            if not HAS_GENAI:
                yield "error", "AI provider packages are not installed"
                return

            messages = self._context_mgr.build_context(conv_id, prompt) if conv_id else [{'role': 'user', 'parts': [{'text': prompt}]}]
            model = genai.GenerativeModel(model_name=model_id or "gemini-2.0-flash", system_instruction=system_prompt)
            parser = TaggedResponseStreamParser()
            for chunk in model.generate_content(messages, stream=True):
                if not chunk.candidates: continue
                for part in chunk.candidates[0].content.parts:
                    if hasattr(part, 'thought') and part.thought:
                        # Clean thought text from AI
                        yield "thinking", part.thought
                    elif hasattr(part, 'text') and part.text:
                        for event, parsed_chunk in parser.feed(part.text):
                            yield event, parsed_chunk
            for event, parsed_chunk in parser.flush():
                yield event, parsed_chunk
        except Exception as e:
            yield "error", str(e)

    def _rewrite_retrieval_intent(self, prompt: str, history: list) -> str:
        """Adds recent SQL context for follow-up retrieval without an LLM call."""
        if not history:
            return prompt

        latest_sql = ""
        for message in reversed(history[-6:]):
            content = str(message.get("content", ""))
            if "```sql" in content:
                latest_sql = content.split("```sql", 1)[1].split("```", 1)[0].strip()
                break
            if "SELECT" in content.upper():
                latest_sql = content[-1200:]
                break

        follow_up_markers = {"that", "it", "this", "previous", "query", "add", "filter"}
        prompt_terms = {term.strip(".,!?").lower() for term in prompt.split()}
        if latest_sql and follow_up_markers.intersection(prompt_terms):
            return f"{prompt}\n\nPrevious SQL context:\n{latest_sql[:1200]}"
        return prompt

    def _load_langchain_history(self, conv_id: str) -> list:
        """Loads compact chat history in LangChain-compatible role/content format."""
        try:
            from models.metadata import AIChatMessage, SessionLocal

            session = SessionLocal()
            try:
                messages = session.query(AIChatMessage)\
                    .filter(AIChatMessage.conversationId == conv_id)\
                    .order_by(AIChatMessage.created_on.desc())\
                    .limit(10)\
                    .all()
                return [{'role': m.role, 'content': m.content} for m in reversed(messages)]
            finally:
                session.close()
        except Exception as e:
            logger.warning("Failed to load LangChain chat history: %s", e)
            return []

# Singleton Instance
ai_service = AIService()
