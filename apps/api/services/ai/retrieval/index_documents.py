"""
index_documents.py

Chunk builders and masking helpers for generalized RAG indexing.
"""

import hashlib
import re
from typing import Any, Dict, List, Optional

from models import QueryHistory, SavedQuery

from .text import build_table_search_text, foreign_keys_for_table

SECRET_VALUE_PATTERN = re.compile(
    r"(?i)\b(api[_\-\s]?key|token|password|secret)\b\s*[:=]\s*['\"]?([A-Za-z0-9_\-./]{8,})['\"]?"
)


def content_hash(content: str) -> str:
    """Returns a stable hash for source and chunk change detection."""
    return hashlib.sha256(str(content or "").encode("utf-8")).hexdigest()


def rough_token_count(content: str) -> int:
    """Provides a cheap token estimate for prompt budgeting."""
    return max(1, len(str(content or "").split()))


def build_schema_chunks(
    database_id: str,
    schema: str,
    table_columns: Dict[str, List[Dict[str, Any]]],
    db_type: str,
    foreign_keys: List[Dict[str, Any]],
    indexes_by_table: Dict[str, List[Dict[str, Any]]],
) -> List[Dict[str, Any]]:
    """Builds object-aware table chunks from database metadata."""
    chunks = []
    for ordinal, (table_name, columns) in enumerate(table_columns.items()):
        content = build_table_search_text(
            table_name,
            columns,
            db_type=db_type,
            foreign_keys=foreign_keys_for_table(table_name, foreign_keys),
            indexes=indexes_by_table.get(table_name, []),
        )
        chunks.append({
            "chunkType": "table",
            "objectName": table_name,
            "schemaName": schema,
            "content": content,
            "metadataJson": {
                "dialect": db_type,
                "columns": [column.get("name") for column in columns if column.get("name")],
                "citation": f"database:{database_id}/schema:{schema}/table:{table_name}",
            },
            "ordinal": ordinal,
        })
    graph_chunk = build_schema_graph_chunk(database_id, schema, table_columns, db_type, foreign_keys)
    if graph_chunk:
        graph_chunk["ordinal"] = len(chunks)
        chunks.append(graph_chunk)
    return chunks


def build_schema_graph_chunk(
    database_id: str,
    schema: str,
    table_columns: Dict[str, List[Dict[str, Any]]],
    db_type: str,
    foreign_keys: List[Dict[str, Any]],
) -> Optional[Dict[str, Any]]:
    """Builds a compact relationship graph chunk for join planning."""
    if not table_columns:
        return None

    table_names = list(table_columns.keys())
    edges = []
    for fk in foreign_keys:
        source = fk.get("table") or fk.get("source_table") or fk.get("constrained_table")
        target = fk.get("foreignTable") or fk.get("referred_table") or fk.get("target_table")
        column = fk.get("column") or fk.get("constrained_column")
        target_column = fk.get("foreignColumn") or fk.get("referred_column") or fk.get("target_column")
        if source and target:
            relation = f"{source}.{column or '?'} -> {target}.{target_column or '?'}"
            edges.append(relation)

    lines = [
        f"Schema relationship graph for {schema}",
        f"Dialect: {db_type}",
        "Tables:",
        ", ".join(table_names),
        "Relationships:",
        *(edges or ["No foreign keys discovered. Use exact table and column evidence before joining."]),
    ]
    return {
        "chunkType": "schema_graph",
        "objectName": f"{schema}_relationship_graph",
        "schemaName": schema,
        "content": "\n".join(lines),
        "metadataJson": {
            "dialect": db_type,
            "tables": table_names,
            "relationships": edges,
            "citation": f"database:{database_id}/schema:{schema}/graph",
        },
    }


def build_saved_query_chunk(saved_query: SavedQuery) -> Dict[str, Any]:
    """Builds one reusable SQL knowledge chunk from a saved query."""
    content = "\n".join([
        f"Saved query: {saved_query.name}",
        f"Description: {saved_query.description or ''}",
        "SQL:",
        saved_query.sql,
    ]).strip()
    return {
        "chunkType": "query",
        "objectName": saved_query.name,
        "schemaName": None,
        "content": content,
        "metadataJson": {
            "savedQueryId": saved_query.id,
            "description": saved_query.description,
            "citation": f"saved-query:{saved_query.id}",
        },
        "ordinal": 0,
    }


def build_query_history_chunk(history_item: QueryHistory) -> Dict[str, Any]:
    """Builds one masked SQL history chunk."""
    masked_sql = mask_sql_literals(history_item.sql)
    content = "\n".join([
        "Query history item",
        f"Status: {history_item.status}",
        f"Execution time ms: {history_item.executionTime or 0}",
        "SQL:",
        masked_sql,
    ]).strip()
    return {
        "chunkType": "query",
        "objectName": f"query_history_{history_item.id[:8]}",
        "schemaName": None,
        "content": content,
        "metadataJson": {
            "queryHistoryId": history_item.id,
            "status": history_item.status,
            "masked": True,
            "citation": f"query-history:{history_item.id}",
        },
        "ordinal": 0,
    }


def build_text_document_chunks(
    source_id: str,
    title: str,
    content: str,
    source_type: str = "document",
    uri: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Builds heading-aware chunks for user-provided text and markdown sources."""
    sections = _split_markdown_sections(mask_sensitive_text(content))
    chunks = []
    ordinal = 0
    for heading, section_text in sections:
        words = section_text.split()
        if not words:
            continue
        for part in _window_words(words, target_size=700, overlap=100):
            citation = f"{source_id}#chunk-{ordinal}"
            chunks.append({
                "chunkType": "paragraph",
                "objectName": heading or title,
                "schemaName": None,
                "content": "\n".join(filter(None, [f"Title: {title}", f"Heading: {heading}" if heading else "", part])),
                "metadataJson": {
                    "title": title,
                    "heading": heading,
                    "uri": uri,
                    "citation": citation,
                },
                "ordinal": ordinal,
            })
            ordinal += 1
    return chunks


def mask_sql_literals(sql: Optional[str]) -> str:
    """Masks quoted strings and numeric literals before indexing query history."""
    text = re.sub(r"'(?:''|[^'])*'", "'?'", str(sql or ""))
    return re.sub(r"\b\d+(?:\.\d+)?\b", "?", text)


def mask_sensitive_text(content: Optional[str]) -> str:
    """Masks obvious secrets before document text enters the RAG index."""
    return SECRET_VALUE_PATTERN.sub(lambda match: f"{match.group(1)}=<redacted>", str(content or ""))


def _split_markdown_sections(content: str) -> List[tuple[str, str]]:
    sections: List[tuple[str, str]] = []
    current_heading = ""
    current_lines: List[str] = []
    for line in str(content or "").splitlines():
        heading_match = re.match(r"^\s{0,3}#{1,6}\s+(.+?)\s*$", line)
        if heading_match and current_lines:
            sections.append((current_heading, "\n".join(current_lines).strip()))
            current_lines = []
        if heading_match:
            current_heading = heading_match.group(1).strip()
            continue
        current_lines.append(line)
    if current_lines:
        sections.append((current_heading, "\n".join(current_lines).strip()))
    if not sections and content.strip():
        sections.append(("", content.strip()))
    return sections


def _window_words(words: List[str], target_size: int, overlap: int) -> List[str]:
    if len(words) <= target_size:
        return [" ".join(words)]
    chunks = []
    start = 0
    step = max(1, target_size - overlap)
    while start < len(words):
        end = min(len(words), start + target_size)
        chunks.append(" ".join(words[start:end]))
        if end == len(words):
            break
        start += step
    return chunks
