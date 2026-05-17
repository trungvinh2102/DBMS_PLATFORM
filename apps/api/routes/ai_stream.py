"""
ai_stream.py

Streaming chat route for the AI Assistant.
"""

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse

from schemas.ai import StreamChatRequest
from services.ai.conversation_store import conversation_store
from services.ai.streaming import (
    append_stream_part,
    build_assistant_history_content,
    encode_sse_event,
    new_response_parts,
)
from services.ai_service import ai_service
from utils.auth_middleware import get_current_user

router = APIRouter()


@router.post("/stream")
def stream_chat(data: StreamChatRequest, current_user: dict = Depends(get_current_user)):
    messages = _resolve_stream_messages(data)
    user_id = current_user.get("userId")
    last_message = messages[-1]["content"]
    conversation_id = conversation_store.ensure_conversation(
        user_id,
        data.databaseId,
        last_message,
        data.conversationId,
    )
    history = conversation_store.load_recent_history(conversation_id) if user_id else []
    ai_service._save_chat("user", last_message, user_id, data.databaseId, conv_id=conversation_id)

    return StreamingResponse(
        _stream_response(data, user_id, last_message, conversation_id, history),
        media_type="text/event-stream",
        headers=_stream_headers(conversation_id),
    )


def _resolve_stream_messages(data: StreamChatRequest):
    messages = data.messages or []
    if not messages and data.text:
        messages = [{"role": "user", "content": data.text}]
    if not messages:
        raise HTTPException(status_code=400, detail="No messages provided")
    return messages


def _stream_response(data: StreamChatRequest, user_id: str, last_message: str, conversation_id: str, history: list):
    response_parts = new_response_parts()
    try:
        for event, chunk in ai_service.stream_generate_response(
            last_message,
            db_id=data.databaseId,
            schema=data.schema_name,
            model_id=data.modelId,
            user_id=user_id,
            history=history,
            conv_id=conversation_id,
        ):
            append_stream_part(response_parts, event, chunk)
            yield encode_sse_event(event, chunk)

        full_response = build_assistant_history_content(response_parts)
        if full_response:
            ai_service._save_chat("assistant", full_response, user_id, data.databaseId, conv_id=conversation_id)
    except Exception as exc:
        error_message = f"Error: {exc}"
        ai_service._save_chat("assistant", error_message, user_id, data.databaseId, conv_id=conversation_id)
        yield encode_sse_event("error", error_message)


def _stream_headers(conversation_id: str):
    return {
        "X-Conversation-Id": conversation_id,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
        "X-Accel-Buffering": "no",
    }
