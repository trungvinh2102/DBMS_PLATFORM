"""
ranking.py

Deterministic ranking utilities for hybrid schema retrieval.
"""

import math
import os
from typing import Dict, List

from .text import matched_terms, normalize_text, tokenize


def cosine_similarity(first_vector: List[float], second_vector: List[float]) -> float:
    """Pure Python cosine similarity calculation."""
    if not first_vector or not second_vector or len(first_vector) != len(second_vector):
        return 0.0

    dot_product = sum(a * b for a, b in zip(first_vector, second_vector))
    first_magnitude = math.sqrt(sum(a * a for a in first_vector))
    second_magnitude = math.sqrt(sum(b * b for b in second_vector))

    if first_magnitude == 0 or second_magnitude == 0:
        return 0.0

    return dot_product / (first_magnitude * second_magnitude)


def fuse_scores(semantic_scores: Dict[str, float], lexical_scores: Dict[str, float]) -> List[tuple[str, float]]:
    """Combines semantic and lexical ranks with reciprocal rank fusion."""
    tables = set(semantic_scores) | set(lexical_scores)
    fused_scores = {table: 0.0 for table in tables}

    for scores in (semantic_scores, lexical_scores):
        ranked_tables = [
            table for table, score in sorted(scores.items(), key=lambda item: item[1], reverse=True)
            if score > 0
        ]
        for rank, table in enumerate(ranked_tables, start=1):
            fused_scores[table] += 1 / (60 + rank)

    return sorted(
        [(table, score) for table, score in fused_scores.items() if score > 0],
        key=lambda item: item[1],
        reverse=True,
    )


def rerank_tables(
    intent: str,
    ranked_tables: List[tuple[str, float]],
    descriptions: Dict[str, str],
) -> List[tuple[str, float]]:
    """Applies a deterministic rerank boost for exact identifiers unless disabled."""
    if os.getenv("QURIODB_RAG_RERANK_ENABLED", "true").lower() in {"0", "false", "no"}:
        return ranked_tables

    normalized_intent = normalize_text(intent)
    reranked = []
    for table_name, score in ranked_tables:
        table_phrase = normalize_text(table_name)
        description = descriptions.get(table_name, "")
        boost = 0.0
        if table_phrase and table_phrase in normalized_intent:
            boost += 0.02
        if any(term in normalized_intent for term in matched_terms(tokenize(description), intent)):
            boost += 0.005
        reranked.append((table_name, score + boost))
    return sorted(reranked, key=lambda item: item[1], reverse=True)
