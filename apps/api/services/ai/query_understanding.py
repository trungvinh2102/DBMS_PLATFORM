"""
query_understanding.py

AI-assisted query classification and retrieval planning for QurioDB RAG.
"""

import json
import re
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional


SUPPORTED_INTENTS = {
    "general_chat",
    "text_to_sql",
    "sql_explain",
    "sql_repair",
    "sql_optimize",
    "schema_question",
    "document_question",
    "out_of_scope",
}

EXPLICIT_DATABASE_SYNTAX_PATTERN = re.compile(
    r"(```sql|\bselect\b|\bwith\b|\bfrom\b|\bjoin\b|\bwhere\b|\bgroup\s+by\b|"
    r"\border\s+by\b|\blimit\b|\binsert\b|\bupdate\b|\bdelete\b|db\.\w+\.|aggregate\()",
    re.IGNORECASE,
)


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
    """Classifies user turns with an AI router and deterministic fallback."""

    def understand(
        self,
        prompt: str,
        history: Optional[List[Dict[str, str]]] = None,
        database_id: Optional[str] = None,
        schema: Optional[str] = None,
        user_id: Optional[str] = None,
        model_id: Optional[str] = None,
    ) -> QueryUnderstanding:
        normalized = self._normalize(prompt)
        if not normalized:
            return QueryUnderstanding(
                intent="general_chat",
                retrieval_query=prompt or "",
                needs_retrieval=False,
                source_types=[],
                database_id=database_id,
                schema=schema or "public",
            )

        history = history or []
        schema_name = schema or "public"
        intent = self._analyze_intent_with_model(
            prompt=prompt,
            history=history,
            database_id=database_id,
            schema=schema_name,
            user_id=user_id,
            model_id=model_id,
        ) or self._fallback_intent(normalized, has_database=bool(database_id))

        return QueryUnderstanding(
            intent=intent,
            retrieval_query=self.rewrite_retrieval_query(prompt, history),
            needs_retrieval=intent not in {"general_chat", "out_of_scope"},
            source_types=self._source_types_for_intent(intent),
            database_id=database_id,
            schema=schema_name,
            filters={"objectTypes": self._object_types_for_intent(intent)},
        )

    def rewrite_retrieval_query(self, prompt: str, history: List[Dict[str, str]]) -> str:
        """Adds recent SQL context for follow-up retrieval without exposing full history."""
        latest_sql = self._latest_sql(history)
        if latest_sql and self._looks_like_follow_up(prompt):
            return f"{prompt}\n\nPrevious SQL context:\n{latest_sql[:1200]}"
        return prompt

    def _analyze_intent_with_model(
        self,
        prompt: str,
        history: List[Dict[str, str]],
        database_id: Optional[str],
        schema: str,
        user_id: Optional[str],
        model_id: Optional[str],
    ) -> Optional[str]:
        if not user_id and not model_id:
            return None

        try:
            from services.ai.langchain_runtime import langchain_runtime
            from services.ai.task_model_router import task_model_router

            routed_model_id = task_model_router.resolve_model_id(
                "router.triage",
                user_id,
                model_id,
                database_id,
            )
            response = langchain_runtime.invoke_text(
                system_prompt=self._intent_router_prompt(),
                prompt=self._intent_router_payload(prompt, history, database_id, schema),
                model_id=routed_model_id,
                user_id=user_id,
                db_id=database_id,
                temperature=0,
                max_tokens=160,
            )
        except Exception:
            return None

        return self._parse_intent_response(response)

    def _fallback_intent(self, normalized: str, has_database: bool = False) -> str:
        if has_database:
            return "text_to_sql"
        if self._has_explicit_database_syntax(normalized):
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

    def _latest_sql(self, history: List[Dict[str, str]]) -> str:
        for message in reversed(history[-6:]):
            content = str(message.get("content", ""))
            if "```sql" in content:
                return content.split("```sql", 1)[1].split("```", 1)[0].strip()
            if "SELECT" in content.upper():
                return content[-1200:]
        return ""

    def _looks_like_follow_up(self, prompt: str) -> bool:
        if not prompt:
            return False
        return len(str(prompt).split()) <= 24

    def _has_explicit_database_syntax(self, normalized: str) -> bool:
        return bool(EXPLICIT_DATABASE_SYNTAX_PATTERN.search(normalized))

    def _intent_router_prompt(self) -> str:
        return """You classify QurioDB user behavior for routing only.
Return strict JSON and no markdown.

Allowed intents:
- general_chat: greeting, thanks, product help, casual chat, no database task.
- text_to_sql: user wants a new query, report, metric, ranking, count, filter, aggregation, or data answer from the connected database.
- sql_explain: user asks to explain existing SQL or query behavior.
- sql_repair: user provides an error or asks to fix a broken query.
- sql_optimize: user asks to optimize, tune, or improve performance.
- schema_question: user asks about tables, columns, relationships, schema, keys, or database structure.
- document_question: user asks about indexed documents, manuals, files, or uploaded knowledge.
- out_of_scope: not answerable by QurioDB.

Use connected_database as important behavioral context. If a database is connected and the user asks for business or data insight, classify as text_to_sql even when no SQL words appear.
Return exactly:
{"intent":"text_to_sql","confidence":0.0,"reason":"short routing reason"}"""

    def _intent_router_payload(
        self,
        prompt: str,
        history: List[Dict[str, str]],
        database_id: Optional[str],
        schema: str,
    ) -> str:
        recent_history = [
            {
                "role": str(item.get("role") or "")[:20],
                "content": str(item.get("content") or "")[:800],
            }
            for item in history[-4:]
        ]
        return json.dumps(
            {
                "connected_database": bool(database_id),
                "database_id": database_id,
                "schema": schema,
                "recent_history": recent_history,
                "user_message": prompt,
            },
            ensure_ascii=False,
        )

    def _parse_intent_response(self, response: str) -> Optional[str]:
        text = str(response or "").strip()
        if not text:
            return None
        if text.startswith("```"):
            text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE).strip()
            text = re.sub(r"\s*```$", "", text).strip()
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            text = text[start:end + 1]
        try:
            payload = json.loads(text)
        except json.JSONDecodeError:
            return None

        intent = str(payload.get("intent") or "").strip()
        return intent if intent in SUPPORTED_INTENTS else None

    def _normalize(self, text: str) -> str:
        normalized = unicodedata.normalize("NFKD", str(text or "").lower())
        ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
        ascii_text = ascii_text.replace("\u0111", "d")
        return " ".join(ascii_text.split())


query_understanding_service = QueryUnderstandingService()
