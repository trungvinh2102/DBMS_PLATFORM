"""
ai_diagnostics.py

Local AI observability endpoints for assistant retrieval telemetry and safety
signals. Responses exclude prompts, retrieved content, provider keys, and SQL.
"""

from fastapi import APIRouter, Depends

from models import RagRetrievalEvent, SessionLocal
from utils.auth_middleware import get_current_user

router = APIRouter()


@router.get("/diagnostics")
def get_ai_diagnostics(databaseId: str | None = None, limit: int = 25, current_user: dict = Depends(get_current_user)):
    safe_limit = max(1, min(limit, 100))
    session = SessionLocal()
    try:
        query = session.query(RagRetrievalEvent).order_by(RagRetrievalEvent.created_on.desc())
        if databaseId:
            query = query.filter(RagRetrievalEvent.databaseId == databaseId)
        events = query.limit(safe_limit).all()
        latencies = [event.latencyMs or 0 for event in events]
        selected_counts = [event.selectedCount or 0 for event in events]
        fallback_count = sum(1 for event in events if (event.trace or {}).get("fallbackReason"))

        return {
            "summary": {
                "eventCount": len(events),
                "avgLatencyMs": round(sum(latencies) / len(latencies), 1) if latencies else 0,
                "maxLatencyMs": max(latencies) if latencies else 0,
                "avgSelectedCount": round(sum(selected_counts) / len(selected_counts), 1) if selected_counts else 0,
                "fallbackCount": fallback_count,
            },
            "events": [_serialize_event(event) for event in events],
        }
    finally:
        session.close()


def _serialize_event(event: RagRetrievalEvent) -> dict:
    trace = event.trace or {}
    safe_items = []
    for item in trace.get("items") or []:
        safe_items.append({
            "sourceType": item.get("sourceType"),
            "title": item.get("title"),
            "score": item.get("score"),
            "semanticScore": item.get("semanticScore"),
            "lexicalScore": item.get("lexicalScore"),
            "matchedTerms": item.get("matchedTerms") or [],
            "citation": (item.get("citation") or {}).get("id"),
        })

    return {
        "id": event.id,
        "conversationId": event.conversationId,
        "messageId": event.messageId,
        "databaseId": event.databaseId,
        "retrievalMode": event.retrievalMode,
        "candidateCount": event.candidateCount,
        "selectedCount": event.selectedCount,
        "latencyMs": event.latencyMs,
        "fallbackReason": trace.get("fallbackReason") or "",
        "warnings": trace.get("warnings") or [],
        "items": safe_items[:8],
        "created_on": event.created_on.isoformat() if event.created_on else None,
    }
