"""
reranking.py

Rerank strategy interface and deterministic implementation for generalized RAG.
"""

import os
from typing import Protocol

from .text import normalize_text
from .types import RagRetrievalResult


class RagReranker(Protocol):
    """Interface for rerank strategies that never bypass permission filtering."""

    def rerank(self, query_text: str, results: list[RagRetrievalResult]) -> list[RagRetrievalResult]:
        """Returns the same candidate set in a better order."""


class DeterministicRagReranker:
    """Offline-safe reranker for exact identifiers and source-type priority."""

    def rerank(self, query_text: str, results: list[RagRetrievalResult]) -> list[RagRetrievalResult]:
        if os.getenv("QURIODB_RAG_RERANK_ENABLED", "true").lower() in {"0", "false", "no"}:
            return results

        normalized_query = normalize_text(query_text)
        scored = []
        for result in results:
            boost = 0.0
            if result.object_name and normalize_text(result.object_name) in normalized_query:
                boost += 0.03
            if result.schema_name and normalize_text(result.schema_name) in normalized_query:
                boost += 0.01
            if result.source_type == "database_schema":
                boost += 0.005
            scored.append((result.score + boost, result))
        return [result for _score, result in sorted(scored, key=lambda item: item[0], reverse=True)]
