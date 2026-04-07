"""
base.py

Base AI service providing shared helper methods for Google GenAI integration,
message persistence, and response parsing.
"""
import os
import re
import uuid
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

try:
    import google.generativeai as genai
    HAS_GENAI = True
except ImportError:
    genai = None
    HAS_GENAI = False

from models.metadata import AIChatMessage, AIGeneratedQuery, UserAIConfig, SessionLocal
from services.conversation_context import ConversationContextManager
from routes.ai_config import decrypt_key

logger = logging.getLogger(__name__)

def _get_system_api_key() -> Optional[str]:
    """Helper to fetch an active API key, preferring Database > ENV."""
    session = SessionLocal()
    try:
        # Get first config
        conf = session.query(UserAIConfig).first()
        if conf and conf.apiKey:
            key = decrypt_key(conf.apiKey)
            if key: return key
    except Exception as e:
        logger.warning(f"Failed to load DB key: {e}")
    finally:
        if session:
            session.close()
    return os.getenv("GOOGLE_API_KEY")

class BaseAIService:
    """Provides foundational AI operations and persistence."""
    def __init__(self, model_name: str = 'gemini-2.5-flash'):
        self.model_name = model_name
        self._context_mgr = ConversationContextManager()
        self._api_configured = False

    def _ensure_genai(self):
        """Ensures the GenerativeAI SDK is configured with an API key."""
        if not self._api_configured:
            api_key = _get_system_api_key()
            if HAS_GENAI and api_key:
                try:
                    genai.configure(api_key=api_key)
                    self._api_configured = True
                except Exception as e:
                    logger.error(f"Failed to configure global Gemini: {e}")
        return self._api_configured

    def _generate_response(self, combined_prompt: str, model_id: Optional[str] = None, user_id: Optional[str] = None) -> str:
        """Internal helper to communicate with the Gemini API, using user-specific keys if available."""
        if not HAS_GENAI:
            return "AI Error: google-generativeai package is not installed"
            
        # Ensure base configuration
        self._ensure_genai()
            
        # Try user-specific config
        if user_id:
            try:
                from routes.ai_config import decrypt_key
                session = SessionLocal()
                config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
                if config and config.apiKey:
                    key = decrypt_key(config.apiKey)
                    if key:
                        genai.configure(api_key=key)
                if session:
                    session.close()
            except Exception as e:
                logger.error(f"Failed to use user AI key: {e}")

        target_model = model_id or self.model_name
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                model = genai.GenerativeModel(target_model)
                response = model.generate_content(combined_prompt)
                return response.text if response and response.text else ""
            except Exception as e:
                # Check for rate limits first
                if "429" in str(e) and attempt < max_retries - 1:
                    logger.warning(f"Quota exceeded (429), retrying in 15 seconds... (Attempt {attempt+1})")
                    time.sleep(15)
                    continue
                
                # Fallback to system key
                api_key = _get_system_api_key()
                if api_key:
                    try:
                        genai.configure(api_key=api_key)
                        model = genai.GenerativeModel(target_model)
                        response = model.generate_content(combined_prompt)
                        return response.text if response and response.text else ""
                    except Exception as fallback_e:
                        if "429" in str(fallback_e) and attempt < max_retries - 1:
                            logger.warning(f"Fallback key Quota exceeded (429), retrying in 15 seconds... (Attempt {attempt+1})")
                            time.sleep(15)
                            continue
                
                logger.error(f"Gemini API call failed with model {target_model}: {e}", exc_info=True)
                return f"AI Error: {str(e)}"

    def _save_chat(self, role: str, content: str, user_id: Optional[str] = None, db_id: Optional[str] = None, conv_id: Optional[str] = None) -> Optional[str]:
        """Persists AI chat messages to the database."""
        session = SessionLocal()
        try:
            msg_id = str(uuid.uuid4())
            msg = AIChatMessage(
                id=msg_id,
                role=role,
                content=str(content)[:5000], 
                userId=user_id,
                databaseId=db_id,
                conversationId=conv_id
            )
            session.add(msg)
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


    def _extract_sql(self, text: str) -> str:
        """Parses the SQL code block out of the AI's markdown response."""
        match = re.search(r"```sql\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        match = re.search(r"```\n([\s\S]*?)\n```", text)
        if match:
            return match.group(1).strip()
        return text.strip()
