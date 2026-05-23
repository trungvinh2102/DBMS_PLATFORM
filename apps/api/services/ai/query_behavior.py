"""
query_behavior.py

Behavior-level routing helpers for QurioDB AI query understanding.
"""

import json
import re
from typing import Any, Dict, Optional

from services.ai.router_terms import router_term_service


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

SUPPORTED_BEHAVIORS = {
    "general_chat",
    "sql_coding",
    "schema_lookup",
    "data_exploration",
    "document_lookup",
    "out_of_scope",
}

SUPPORTED_COMPLEXITIES = {"simple", "moderate", "complex"}
SUPPORTED_RAG_MODES = {"none", "shallow", "deep"}
SUPPORTED_REASONING_MODES = {"fast", "normal", "deep"}

EXPLICIT_DATABASE_SYNTAX_PATTERN = re.compile(
    r"(```sql|\bselect\b|\bwith\b|\bfrom\b|\bjoin\b|\bwhere\b|\bgroup\s+by\b|"
    r"\border\s+by\b|\blimit\b|\binsert\b|\bupdate\b|\bdelete\b|db\.\w+\.|aggregate\()",
    re.IGNORECASE,
)


class QueryBehaviorAnalyzer:
    """Builds behavior-aware routing decisions from model output or deterministic fallback."""

    def fallback_analysis(self, normalized: str, has_database: bool = False) -> Dict[str, Any]:
        if self.looks_like_general_chat(normalized):
            return self.analysis_payload("general_chat", "general_chat", 0.9, "deterministic general chat fallback")

        if self.has_explicit_database_syntax(normalized):
            intent = self.intent_for_database_syntax(normalized)
            return self.analysis_payload(
                intent,
                self.behavior_for_intent(intent, normalized),
                0.72,
                "deterministic database syntax fallback",
            )

        if self.looks_like_document_request(normalized):
            return self.analysis_payload(
                "document_question",
                "document_lookup",
                0.72,
                "deterministic document lookup fallback",
            )

        if has_database and self.looks_like_schema_request(normalized):
            return self.analysis_payload(
                "schema_question",
                "schema_lookup",
                0.72,
                "deterministic schema lookup fallback",
            )

        if has_database and self.looks_like_data_request(normalized):
            return self.analysis_payload(
                "text_to_sql",
                "data_exploration",
                0.68,
                "connected database and business data request",
            )

        if has_database and self.looks_like_sql_coding_request(normalized):
            return self.analysis_payload(
                "text_to_sql",
                "sql_coding",
                0.62,
                "connected database and SQL coding request",
            )

        if has_database:
            return self.analysis_payload(
                "general_chat",
                "general_chat",
                0.52,
                "connected database is insufficient without a database task",
            )

        return self.analysis_payload(
            "out_of_scope",
            "out_of_scope",
            0.6,
            "no connected database or clear QurioDB task",
        )

    def parse_router_response(self, response: str, normalize, prompt: str = "") -> Optional[Dict[str, Any]]:
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
        if intent not in SUPPORTED_INTENTS:
            return None

        behavior = str(payload.get("behavior") or "").strip()
        if behavior not in SUPPORTED_BEHAVIORS:
            behavior = self.behavior_for_intent(intent, normalize(prompt or str(payload.get("reason") or "")))

        confidence = self.clamp_float(payload.get("confidence"), default=0.65)
        complexity = str(payload.get("complexity") or "").strip()
        if complexity not in SUPPORTED_COMPLEXITIES:
            complexity = self.complexity_for_behavior(behavior, "")

        exploration_score = self.clamp_float(payload.get("exploration_score"), default=0.0)
        if behavior == "data_exploration" and exploration_score <= 0:
            exploration_score = max(0.7, confidence)

        rag_mode = str(payload.get("rag_mode") or "").strip()
        if rag_mode not in SUPPORTED_RAG_MODES:
            rag_mode = self.rag_mode_for_behavior(behavior, confidence, exploration_score)

        reasoning_mode = str(payload.get("reasoning_mode") or "").strip()
        if reasoning_mode not in SUPPORTED_REASONING_MODES:
            reasoning_mode = self.reasoning_mode_for_rag_mode(rag_mode)

        return self.analysis_payload(
            intent=intent,
            behavior=behavior,
            confidence=confidence,
            complexity=complexity,
            exploration_score=exploration_score,
            rag_mode=rag_mode,
            reasoning_mode=reasoning_mode,
            reason=str(payload.get("reason") or "model router"),
        )

    def analysis_payload(
        self,
        intent: str,
        behavior: str,
        confidence: float,
        reason: str,
        complexity: Optional[str] = None,
        exploration_score: Optional[float] = None,
        rag_mode: Optional[str] = None,
        reasoning_mode: Optional[str] = None,
    ) -> Dict[str, Any]:
        normalized_behavior = behavior if behavior in SUPPORTED_BEHAVIORS else self.behavior_for_intent(intent, "")
        score = exploration_score
        if score is None:
            score = 0.85 if normalized_behavior == "data_exploration" else 0.0
        selected_rag_mode = rag_mode or self.rag_mode_for_behavior(normalized_behavior, confidence, score)
        return {
            "intent": intent if intent in SUPPORTED_INTENTS else "out_of_scope",
            "behavior": normalized_behavior,
            "confidence": self.clamp_float(confidence, default=0.0),
            "reason": reason,
            "complexity": complexity or self.complexity_for_behavior(normalized_behavior, reason),
            "exploration_score": self.clamp_float(score, default=0.0),
            "rag_mode": selected_rag_mode,
            "reasoning_mode": reasoning_mode or self.reasoning_mode_for_rag_mode(selected_rag_mode),
        }

    def behavior_for_intent(self, intent: str, normalized: str) -> str:
        if intent == "general_chat":
            return "general_chat"
        if intent == "schema_question":
            return "schema_lookup"
        if intent == "document_question":
            return "document_lookup"
        if intent == "out_of_scope":
            return "out_of_scope"
        if intent in {"sql_explain", "sql_repair", "sql_optimize"}:
            return "sql_coding"
        if intent == "text_to_sql" and self.looks_like_data_request(normalized):
            return "data_exploration"
        return "sql_coding"

    def rag_mode_for_behavior(self, behavior: str, confidence: float, exploration_score: float) -> str:
        if behavior == "data_exploration" and confidence >= 0.65 and exploration_score >= 0.65:
            return "deep"
        if behavior in {"sql_coding", "schema_lookup", "document_lookup"}:
            return "shallow"
        return "none"

    def reasoning_mode_for_rag_mode(self, rag_mode: str) -> str:
        if rag_mode == "deep":
            return "deep"
        if rag_mode == "shallow":
            return "normal"
        return "fast"

    def complexity_for_behavior(self, behavior: str, text: str) -> str:
        if behavior == "data_exploration":
            return "complex" if len(str(text).split()) > 18 else "moderate"
        if behavior in {"sql_coding", "schema_lookup", "document_lookup"}:
            return "moderate"
        return "simple"

    def has_explicit_database_syntax(self, normalized: str) -> bool:
        return bool(EXPLICIT_DATABASE_SYNTAX_PATTERN.search(normalized))

    def looks_like_general_chat(self, normalized: str) -> bool:
        return bool(re.match(r"^(xin chao|chao|hi|hello|hey|cam on|thanks|thank you|ok|okay|help)\b", normalized))

    def looks_like_data_request(self, normalized: str) -> bool:
        if not normalized:
            return False
        question_shapes = (
            " nao " in f" {normalized} "
            or normalized.startswith(("which ", "what ", "why ", "how many ", "how much "))
            or "?" in normalized
        )
        metric_command = normalized.startswith(("show ", "list ", "find ", "get ")) and router_term_service.any_match(
            normalized,
            "metric_terms",
        )
        return (
            question_shapes
            and router_term_service.any_match(normalized, "exploration_terms")
        ) or metric_command

    def looks_like_sql_coding_request(self, normalized: str) -> bool:
        return router_term_service.any_match(normalized, "sql_coding_terms")

    def looks_like_schema_request(self, normalized: str) -> bool:
        return router_term_service.any_match(normalized, "schema_terms")

    def looks_like_document_request(self, normalized: str) -> bool:
        return router_term_service.any_match(normalized, "document_terms")

    def intent_for_database_syntax(self, normalized: str) -> str:
        if any(term in normalized for term in {"fix", "repair", "error", "sua", "loi"}):
            return "sql_repair"
        if any(term in normalized for term in {"optimize", "tune", "performance", "toi uu"}):
            return "sql_optimize"
        if any(term in normalized for term in {"explain", "giai thich"}):
            return "sql_explain"
        return "text_to_sql"

    def clamp_float(self, value: Any, default: float = 0.0) -> float:
        try:
            number = float(value)
        except (TypeError, ValueError):
            number = default
        return max(0.0, min(1.0, number))


query_behavior_analyzer = QueryBehaviorAnalyzer()
