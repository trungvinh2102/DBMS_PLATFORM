"""
base.py

Base AI service providing shared helper methods for LangChain text generation,
message persistence, and response parsing.
"""
import re
import uuid
import logging
import datetime
import hashlib
from typing import Dict, Any, Optional

from models import AIChatMessage, AIConversation, AIGeneratedQuery, RagRetrievalEvent, SessionLocal, UserAIConfig
from ..conversation_context import ConversationContextManager
from routes.ai_config import decrypt_key
from .langchain_runtime import get_ai_api_key, langchain_runtime

logger = logging.getLogger(__name__)

def _get_system_api_key() -> Optional[str]:
    """Fetches the Google/Gemini API key from encrypted DB settings."""
    api_key = get_ai_api_key(provider="google")
    if api_key:
        return api_key

    session = SessionLocal()
    try:
        config = (
            session.query(UserAIConfig)
            .filter(UserAIConfig.provider.in_(["Google", "Google Gemini", "Gemini", "google", "gemini"]))
            .first()
        )
        if config and config.apiKey:
            return decrypt_key(config.apiKey)
    except Exception as e:
        logger.warning(f"Failed to load Gemini DB key: {e}")
    finally:
        session.close()
    return None

class BaseAIService:
    """Provides foundational AI operations and persistence."""
    def __init__(self, model_name: str = 'gemini-2.5-flash'):
        self.model_name = model_name
        self._context_mgr = ConversationContextManager()

    def _generate_response(self, combined_prompt: str, model_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """Internal helper to communicate with every supported provider through LangChain."""
        provider = langchain_runtime.resolve_provider(model_id=model_id, user_id=user_id)
        try:
            return langchain_runtime.invoke_text(
                system_prompt="You are QurioDB's SQL-focused AI assistant.",
                prompt=combined_prompt,
                model_id=model_id,
                user_id=user_id,
                provider=provider,
            )
        except Exception as e:
            logger.warning("LangChain generation failed for provider %s: %s", provider, e)
        return f"AI Error: LangChain generation failed for provider {provider}. Configure its API key and model settings."

    def _save_chat(self, role: str, content: str, user_id: Optional[str] = None, db_id: Optional[str] = None, conv_id: Optional[str] = None) -> Optional[str]:
        """Persists AI chat messages to the database."""
        session = SessionLocal()
        try:
            msg_id = str(uuid.uuid4())
            msg = AIChatMessage(
                id=msg_id,
                role=role,
                content=str(content),
                userId=user_id,
                databaseId=db_id,
                conversationId=conv_id
            )
            session.add(msg)
            if conv_id:
                conversation = session.query(AIConversation).get(conv_id)
                if conversation:
                    conversation.changed_on = datetime.datetime.now(datetime.UTC).replace(tzinfo=None)
            session.commit()
            return msg_id
        except Exception as e:
            logger.error(f"Failed to save AI chat message: {e}")
            session.rollback()
            return None
        finally:
            if session:
                session.close()


    def _save_generated_query(self, sql: str, prompt: Optional[str], explanation: Optional[str], user_id: Optional[str] = None, db_id: Optional[str] = None):
        """Persists AI generated SQL queries to the database."""
        session = SessionLocal()
        try:
            query = AIGeneratedQuery(
                id=str(uuid.uuid4()),
                prompt=str(prompt)[:2000] if prompt else None,
                sql=str(sql),
                explanation=str(explanation)[:5000] if explanation else None,
                userId=user_id,
                databaseId=db_id
            )
            session.add(query)
            session.commit()
        except Exception as e:
            logger.error(f"Failed to save AI generated query: {e}")
            session.rollback()
        finally:
            if session:
                session.close()

    def _save_retrieval_event(
        self,
        trace: Optional[Dict[str, Any]],
        query_text: str,
        db_id: Optional[str] = None,
        message_id: Optional[str] = None,
        conv_id: Optional[str] = None,
        latency_ms: int = 0,
    ) -> None:
        """Persists safe RAG telemetry without storing full user text."""
        if not trace:
            return

        session = SessionLocal()
        try:
            session.add(RagRetrievalEvent(
                id=str(uuid.uuid4()),
                conversationId=conv_id,
                messageId=message_id,
                databaseId=db_id or trace.get("databaseId"),
                queryTextHash=hashlib.sha256(str(query_text or "").encode("utf-8")).hexdigest(),
                retrievalMode=trace.get("retrievalMode") or "unknown",
                candidateCount=int(trace.get("candidateBudget") or 0),
                selectedCount=int(trace.get("selectedCount") or len(trace.get("tables") or [])),
                latencyMs=latency_ms,
                trace=trace,
            ))
            session.commit()
        except Exception as e:
            logger.warning("Failed to save RAG retrieval event: %s", e)
            session.rollback()
        finally:
            if session:
                session.close()


    def _extract_sql(self, text: str) -> str:
        """Parses the SQL code block out of the AI's markdown response."""
        match = re.search(r"```sql\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        match = re.search(r"```\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        return text.strip()
