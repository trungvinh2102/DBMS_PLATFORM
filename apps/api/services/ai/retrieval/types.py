"""
types.py

Typed retrieval result objects used by schema RAG and retrieval traces.
"""

from dataclasses import dataclass, field
from typing import Any, Dict, List


@dataclass(frozen=True)
class TableRetrievalResult:
    """Ranked table retrieval result with signal-level details for prompt context."""

    table_name: str
    score: float
    semantic_score: float
    lexical_score: float
    matched_terms: List[str]
    schema_name: str = "public"
    columns: List[str] = field(default_factory=list)
    reasons: List[str] = field(default_factory=list)

    def to_trace_item(self) -> Dict[str, Any]:
        """Serializes retrieval evidence without connection secrets."""
        return {
            "name": self.table_name,
            "schema": self.schema_name,
            "score": round(self.score, 4),
            "semanticScore": round(self.semantic_score, 4),
            "lexicalScore": round(self.lexical_score, 4),
            "columns": self.columns,
            "reasons": self.reasons,
        }
