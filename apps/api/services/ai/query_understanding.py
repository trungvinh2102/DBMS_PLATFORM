"""
query_understanding.py

Deterministic query classification and retrieval planning for QurioDB RAG.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


GENERAL_CHAT_PATTERNS = (
    r"^(hi|hello|hey|thanks|thank you|ok|okay|bye)\b",
    r"^(xin chào|chào|cam on|cảm ơn|tạm biệt|tam biet)\b",
    r"^(bạn là ai|ban la ai|mày là ai|may la ai|m la ai|who are you|what are you|what can you do|help)\??$",
)

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
    "người dùng", "doanh thu", "dem", "đếm",
}

SQL_EXPLAIN_MARKERS = {"explain", "giải thích", "giai thich", "why", "what does"}
SQL_REPAIR_MARKERS = {"fix", "repair", "error", "failed", "sửa", "sua", "lỗi", "loi"}
SQL_OPTIMIZE_MARKERS = {"optimize", "tune", "faster", "performance", "tối ưu", "toi uu"}
SCHEMA_QUESTION_MARKERS = {"schema", "table", "column", "relationship", "foreign key", "bảng", "cột"}
DOCUMENT_MARKERS = {"document", "pdf", "markdown", "manual", "doc", "file", "tài liệu", "tai lieu"}


@dataclass(frozen=True)
class QueryUnderstanding:
    """Retrieval plan produced before RAG and prompt assembly."""

    intent: str
    retrieval_query: str
    needs_retrieval: bool
    source_types: List[str]
    database_id: Optional[str] = None
    schema: str = "public"
    filters: Dict[str, Any] = field(default_factory=dict)
    allow_sample_rows: bool = False
    max_latency_ms: int = 1500


class QueryUnderstandingService:
    """Classifies user turns without an LLM call so routing stays cheap and testable."""

    def understand(
        self,
        prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
        database_id: Optional[str] = None,
        schema: Optional[str] = None,
    ) -> QueryUnderstanding:
        normalized = self._normalize(prompt)
        if not normalized or self._is_general_chat(normalized):
            return QueryUnderstanding(
                intent="general_chat",
                retrieval_query=prompt or "",
                needs_retrieval=False,
                source_types=[],
                database_id=database_id,
                schema=schema or "public",
            )

        rewritten = self.rewrite_retrieval_query(prompt, history or [])
        intent = self._classify(normalized)
        return QueryUnderstanding(
            intent=intent,
            retrieval_query=rewritten,
            needs_retrieval=intent not in {"general_chat", "out_of_scope"},
            source_types=self._source_types_for_intent(intent),
            database_id=database_id,
            schema=schema or "public",
            filters={"objectTypes": self._object_types_for_intent(intent)},
        )

    def rewrite_retrieval_query(self, prompt: str, history: List[Dict[str, str]]) -> str:
        """Adds recent SQL context for follow-up retrieval without exposing full history."""
        latest_sql = self._latest_sql(history)
        if latest_sql and self._is_follow_up(prompt):
            return f"{prompt}\n\nPrevious SQL context:\n{latest_sql[:1200]}"
        return prompt

    def _classify(self, normalized: str) -> str:
        if self._contains_any(normalized, DOCUMENT_MARKERS):
            return "document_question"
        if self._contains_any(normalized, SQL_REPAIR_MARKERS):
            return "sql_repair"
        if self._contains_any(normalized, SQL_OPTIMIZE_MARKERS):
            return "sql_optimize"
        if self._contains_any(normalized, SQL_EXPLAIN_MARKERS):
            return "sql_explain"
        if self._contains_any(normalized, SCHEMA_QUESTION_MARKERS):
            return "schema_question"
        if any(keyword in normalized for keyword in DATABASE_TASK_KEYWORDS):
            return "text_to_sql"
        return "out_of_scope"

    def _source_types_for_intent(self, intent: str) -> List[str]:
        if intent == "document_question":
            return ["document", "web_page"]
        if intent in {"text_to_sql", "sql_explain", "sql_repair", "sql_optimize"}:
            return ["database_schema", "saved_query", "query_history"]
        if intent == "schema_question":
            return ["database_schema"]
        return []

    def _object_types_for_intent(self, intent: str) -> List[str]:
        if intent == "schema_question":
            return ["table", "column_group", "ddl"]
        if intent.startswith("sql") or intent == "text_to_sql":
            return ["table", "query"]
        return []

    def _is_general_chat(self, normalized: str) -> bool:
        return any(re.search(pattern, normalized) for pattern in GENERAL_CHAT_PATTERNS)

    def _contains_any(self, normalized: str, markers: set[str]) -> bool:
        return any(marker in normalized for marker in markers)

    def _latest_sql(self, history: List[Dict[str, str]]) -> str:
        for message in reversed(history[-6:]):
            content = str(message.get("content", ""))
            if "```sql" in content:
                return content.split("```sql", 1)[1].split("```", 1)[0].strip()
            if "SELECT" in content.upper():
                return content[-1200:]
        return ""

    def _is_follow_up(self, prompt: str) -> bool:
        prompt_terms = {term.strip(".,!?").lower() for term in str(prompt or "").split()}
        return bool({
            "that", "it", "this", "previous", "query", "add", "filter", "sort",
            "same", "now", "fix", "explain", "optimize", "đó", "do", "nó",
            "nay", "này", "trước", "truoc", "thêm", "them", "lọc", "loc",
            "sắp xếp", "sap xep", "sửa", "sua",
        }.intersection(prompt_terms))

    def _normalize(self, text: str) -> str:
        return " ".join(str(text or "").lower().split())


query_understanding_service = QueryUnderstandingService()
