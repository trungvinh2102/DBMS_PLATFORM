"""
streaming.py

Helpers for AI Assistant server-sent events and persisted stream content.
"""

import json
from typing import Dict, List, Tuple

STREAM_RESPONSE_PARTS = {
    "thinking": [],
    "confidence": [],
    "message": [],
    "sql": [],
    "analysis": [],
}


def new_response_parts() -> Dict[str, List[str]]:
    """Returns a fresh stream response accumulator."""
    parts = {key: [] for key in STREAM_RESPONSE_PARTS}
    parts["_events"] = []
    return parts


def encode_sse_event(event: str, chunk) -> str:
    """Encodes one SSE event with JSON-safe data."""
    return f"event: {event}\ndata: {json.dumps(chunk)}\n\n"


def append_stream_part(parts: Dict[str, List[str]], event: str, chunk: str) -> None:
    """Stores every emitted stream event for chat history persistence."""
    event_name = str(event or "message")
    text = str(chunk)
    parts.setdefault(event_name, []).append(text)
    parts.setdefault("_events", []).append((event_name, text))


def build_assistant_history_content(parts: Dict[str, List[str]]) -> str:
    """Rebuilds streamed semantic events into the legacy persisted message format."""
    events = parts.get("_events") or _events_from_legacy_parts(parts)
    blocks = []
    for event, chunks in _group_consecutive_events(events):
        content = "".join(chunks).strip()
        if not content:
            continue
        blocks.append(_format_event_for_history(event, content))

    return "\n\n".join(blocks)


def _events_from_legacy_parts(parts: Dict[str, List[str]]) -> List[Tuple[str, str]]:
    """Creates ordered events for callers that built the old accumulator shape."""
    events = []
    for event in STREAM_RESPONSE_PARTS:
        events.extend((event, chunk) for chunk in parts.get(event, []))
    return events


def _group_consecutive_events(events: List[Tuple[str, str]]) -> List[Tuple[str, List[str]]]:
    """Keeps stream ordering while joining adjacent chunks from the same event."""
    grouped = []
    for event, chunk in events:
        if grouped and grouped[-1][0] == event:
            grouped[-1][1].append(chunk)
        else:
            grouped.append((event, [chunk]))
    return grouped


def _format_event_for_history(event: str, content: str) -> str:
    """Formats one persisted stream event in a reload-friendly legacy shape."""
    if event == "thinking":
        return f"<thinking>\n{content}\n</thinking>"
    if event == "confidence":
        return f"<confidence>{content}</confidence>"
    if event == "message":
        return content
    if event == "sql":
        return f"```sql\n{content}\n```"
    if event == "analysis":
        return f"### ANALYSIS:\n{content}"
    return f'<stream_event name="{event}">{content}</stream_event>'
