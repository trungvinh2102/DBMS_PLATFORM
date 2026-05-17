"""
ai_conversations.py

Routes for AI Assistant conversation history and feedback.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException

from schemas.ai import SubmitFeedbackRequest, UpdateConversationRequest
from services.ai.conversation_store import conversation_store
from utils.auth_middleware import get_current_user

router = APIRouter()


@router.get("/history")
def get_chat_history(databaseId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    try:
        return conversation_store.get_history(current_user.get("userId"), databaseId)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/conversations")
def get_conversations(databaseId: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    try:
        return conversation_store.list_conversations(current_user.get("userId"), databaseId)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/conversations/{id}")
def get_conversation_messages(id: str, current_user: dict = Depends(get_current_user)):
    try:
        return conversation_store.get_conversation_messages(id, current_user.get("userId"))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/conversations/{id}")
def update_conversation(id: str, data: UpdateConversationRequest, current_user: dict = Depends(get_current_user)):
    try:
        return conversation_store.update_conversation(
            id,
            current_user.get("userId"),
            data.title,
            data.isPinned,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/conversations/{id}")
def delete_conversation(id: str, current_user: dict = Depends(get_current_user)):
    try:
        return conversation_store.delete_conversation(id, current_user.get("userId"))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/feedback")
def submit_feedback(data: SubmitFeedbackRequest, current_user: dict = Depends(get_current_user)):
    try:
        return conversation_store.submit_feedback(
            current_user.get("userId"),
            data.messageId,
            data.rating,
            data.correction or "",
            data.conversationId,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
