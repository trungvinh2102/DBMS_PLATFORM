"""
ai_service.py

Specialized AI service delegator that coordinates multiple AI strategies
(SQL tasks, Agents, Semantic Context) for QurioDB.
"""
import logging
import re
from typing import Dict, Any, Optional

from .ai.sql import SqlAIService
from .ai.agent import AgentAIService
from .ai.context import schema_context_service
from .ai.feedback_context import feedback_context_service
from .ai.langchain_runtime import langchain_runtime
from .ai.stream_parser import TaggedResponseStreamParser

logger = logging.getLogger(__name__)

DATABASE_TASK_KEYWORDS = {
    "sql", "query", "queries", "database", "db", "schema", "table", "tables",
    "column", "columns", "row", "rows", "join", "filter", "where", "group",
    "order", "limit", "select", "insert", "update", "delete", "mongodb",
    "mql", "collection", "index", "indexes", "explain", "optimize",
    "users", "orders", "customers", "revenue", "count", "sum", "average",
    "analysis", "analytics", "data", "dataset", "report",
    "truy vấn", "cơ sở dữ liệu", "du lieu", "dữ liệu", "bang", "bảng",
    "cot", "cột", "dong", "dòng", "loc", "lọc", "sap xep", "sắp xếp",
    "thong ke", "thống kê", "phan tich", "phân tích", "nguoi dung",
    "người dùng", "doanh thu", "dem", "đếm", "online", "nhay cam",
    "nhạy cảm",
}

GENERAL_CHAT_PATTERNS = (
    r"^(hi|hello|hey|thanks|thank you|ok|okay|bye)\b",
    r"^(xin chào|chào|cảm ơn|cam on|tạm biệt|tam biet)\b",
    r"^(bạn là ai|ban la ai|mày là ai|may la ai|m la ai|who are you|what are you|what can you do|help)\??$",
)

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
            return {"completion": "", "error": f"LangChain autocomplete failed for provider {provider}"}

    def _clean_sql_code(self, completion: str) -> str:
        """Helper to clean autocomplete text."""
        completion = completion.strip()
        if completion.startswith("```"):
            completion = completion.replace("```sql\n", "").replace("```sql", "").replace("```\n", "").replace("```", "").strip()
        return completion

    # --- Streaming Logic ---
    def stream_generate_response(self, prompt: str, db_id: Optional[str] = None, schema: str = "public", model_id: Optional[str] = None, user_id: Optional[str] = None, history: Optional[list] = None, conv_id: Optional[str] = None):
        """Streams responses for chat interfaces using SSE events."""
        history = history or []
        is_database_request = self._is_database_assistant_request(prompt, history)
        quick_response = self._quick_general_response(prompt) if not is_database_request else ""
        if quick_response:
            yield "message", quick_response
            return

        # Yield clean text. Frontend will handle wrapping for the UI steps.
        yield "thinking", "Đang khởi tạo bối cảnh..."
        
        system_prompt = "You are the Supreme SQL Architect. Use English for reasoning steps but respond in the user's language."
        if db_id and is_database_request:
            yield "thinking", "Phân tích lược đồ..."
            
            retrieval_intent = self._rewrite_retrieval_intent(prompt, history)

            context_result = schema_context_service.build_schema_context(db_id, schema, intent=retrieval_intent)
            context = context_result.context

            # Fetch feedback context if user_id is available
            feedback = ""
            if user_id:
                yield "thinking", "Học hỏi từ phản hồi của các bạn..."
                feedback = feedback_context_service.get_feedback_context(db_id, user_id)

            from .prompts import get_sql_generation_prompt
            system_prompt = get_sql_generation_prompt(context, feedback_context=feedback)
            yield "thinking", "Sẵn sàng."
        elif db_id:
            from .prompts import get_general_chat_prompt
            system_prompt = get_general_chat_prompt()
            yield "thinking", "Khởi tạo xong."
        else:
            yield "thinking", "Khởi tạo xong."

        try:
            langchain_history = history
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
        yield "error", f"LangChain streaming failed for provider {provider}"

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

    def _is_database_assistant_request(self, prompt: str, history: list) -> bool:
        """Returns true when a chat turn needs expensive schema retrieval."""
        normalized = " ".join(str(prompt or "").lower().split())
        if not normalized:
            return False

        if any(re.search(pattern, normalized) for pattern in GENERAL_CHAT_PATTERNS):
            return False

        if self._has_recent_sql_context(history) and self._is_follow_up_prompt(normalized):
            return True

        return any(keyword in normalized for keyword in DATABASE_TASK_KEYWORDS)

    def _has_recent_sql_context(self, history: list) -> bool:
        for message in reversed(history[-6:]):
            content = str(message.get("content", ""))
            upper_content = content.upper()
            if "```SQL" in upper_content or "SELECT " in upper_content or "FROM " in upper_content:
                return True
        return False

    def _is_follow_up_prompt(self, normalized_prompt: str) -> bool:
        follow_up_markers = {
            "that", "it", "this", "previous", "query", "add", "filter", "sort",
            "same", "now", "fix", "explain", "optimize", "đó", "do", "nó",
            "nay", "này", "trước", "truoc", "thêm", "them", "lọc", "loc",
            "sắp xếp", "sap xep", "sửa", "sua",
        }
        prompt_terms = {term.strip(".,!?").lower() for term in normalized_prompt.split()}
        return bool(follow_up_markers.intersection(prompt_terms))

    def _quick_general_response(self, prompt: str) -> str:
        """Returns instant responses for obvious non-database chat turns."""
        normalized = " ".join(str(prompt or "").lower().strip().split())
        if not normalized:
            return ""

        if re.match(r"^(bạn là ai|ban la ai|mày là ai|may la ai|m la ai|who are you|what are you)\??$", normalized):
            return (
                "Tôi là QurioDB copilot, trợ lý trong QurioDB. "
                "Tôi có thể giúp bạn tạo, giải thích, tối ưu và sửa truy vấn SQL/MongoDB, "
                "hoặc phân tích dữ liệu từ database bạn đang kết nối."
            )

        if re.match(r"^(xin chào|chào|hi|hello|hey)\b", normalized):
            return "Xin chào! Tôi là QurioDB copilot. Bạn muốn tôi hỗ trợ truy vấn hay phân tích dữ liệu nào?"

        if re.match(r"^(cảm ơn|cam on|thanks|thank you|ok|okay)\b", normalized):
            return "Rất vui được hỗ trợ bạn."

        if re.match(r"^(help|what can you do)\??$", normalized):
            return (
                "Tôi có thể giúp tạo SQL/MongoDB query, giải thích query, tối ưu hiệu năng, "
                "sửa lỗi truy vấn và phân tích dữ liệu dựa trên schema trong QurioDB."
            )

        return ""

    def _load_langchain_history(self, conv_id: str) -> list:
        """Loads compact chat history in LangChain-compatible role/content format."""
        try:
            from models import AIChatMessage, SessionLocal

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
