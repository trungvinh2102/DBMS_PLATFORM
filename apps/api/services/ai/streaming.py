"""
streaming.py

Helpers for AI Assistant server-sent events and persisted stream content.
"""

import json
from typing import Dict, List

STREAM_RESPONSE_PARTS = {
    "thinking": [],
    "confidence": [],
    "message": [],
    "sql": [],
    "analysis": [],
}

STATUS_EVENTS = {
    "Initializing context...",
    "Analyzing schema...",
    "Learning from your feedback...",
    "Sáºµn sÃ ng.",
    "Khá»Ÿi táº¡o xong.",
}


def new_response_parts() -> Dict[str, List[str]]:
    """Returns a fresh stream response accumulator."""
    return {key: [] for key in STREAM_RESPONSE_PARTS}


def encode_sse_event(event: str, chunk) -> str:
    """Encodes one SSE event with JSON-safe data."""
    return f"event: {event}\ndata: {json.dumps(chunk)}\n\n"


def append_stream_part(parts: Dict[str, List[str]], event: str, chunk: str) -> None:
    """Stores content-bearing stream parts for chat history persistence."""
    if event in parts and (event != "thinking" or chunk not in STATUS_EVENTS):
        parts[event].append(chunk)


def build_assistant_history_content(parts: Dict[str, List[str]]) -> str:
    """Rebuilds streamed semantic events into the legacy persisted message format."""
    blocks = []
    thinking = "".join(parts.get("thinking", [])).strip()
    confidence = "".join(parts.get("confidence", [])).strip()
    message = "".join(parts.get("message", [])).strip()
    sql = "".join(parts.get("sql", [])).strip()
    analysis = "".join(parts.get("analysis", [])).strip()

    if thinking:
        blocks.append(f"<thinking>\n{thinking}\n</thinking>")
    if confidence:
        blocks.append(f"<confidence>{confidence}</confidence>")
    if message:
        blocks.append(message)
    if sql:
        blocks.append(f"```sql\n{sql}\n```")
    if analysis:
        blocks.append(f"### ANALYSIS:\n{analysis}")

    return "\n\n".join(blocks)
