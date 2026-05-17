"""
conversation_store.py

Persistence helpers for AI Assistant conversations, history, and feedback.
"""

import datetime
import uuid
from typing import Dict, List, Optional

from fastapi import HTTPException

from models.metadata import AIChatMessage, AIConversation, AIFeedback, SessionLocal


class AIConversationStore:
    """Encapsulates database operations for AI conversation routes."""

    def ensure_conversation(self, user_id: str, database_id: str, title_source: str, conversation_id: Optional[str]) -> str:
        """Returns an existing conversation id or creates a new conversation."""
        if conversation_id:
            return conversation_id

        session = SessionLocal()
        try:
            new_id = str(uuid.uuid4())
            session.add(AIConversation(
                id=new_id,
                title=self._title_from_text(title_source),
                userId=user_id,
                databaseId=database_id,
            ))
            session.commit()
            return new_id
        except Exception as exc:
            session.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to create conversation: {exc}")
        finally:
            session.close()

    def load_recent_history(self, conversation_id: str, limit: int = 10) -> List[Dict[str, str]]:
        """Loads recent messages in chronological order."""
        session = SessionLocal()
        try:
            messages = session.query(AIChatMessage)\
                .filter(AIChatMessage.conversationId == conversation_id)\
                .order_by(AIChatMessage.created_on.desc())\
                .limit(limit)\
                .all()
            return [{"role": message.role, "content": message.content} for message in reversed(messages)]
        finally:
            session.close()

    def get_history(self, user_id: str, database_id: Optional[str] = None) -> List[Dict]:
        """Returns flat chat message history for a user."""
        session = SessionLocal()
        try:
            query = session.query(AIChatMessage).filter(AIChatMessage.userId == user_id)
            if database_id:
                query = query.filter(AIChatMessage.databaseId == database_id)
            return [self._message_to_dict(message) for message in query.order_by(AIChatMessage.created_on.asc()).limit(50).all()]
        finally:
            session.close()

    def list_conversations(self, user_id: str, database_id: Optional[str] = None) -> List[Dict]:
        """Lists conversations for a user."""
        session = SessionLocal()
        try:
            query = session.query(AIConversation).filter(AIConversation.userId == user_id)
            if database_id:
                query = query.filter(AIConversation.databaseId == database_id)
            conversations = query.order_by(AIConversation.isPinned.desc(), AIConversation.changed_on.desc()).all()
            return [self._conversation_to_dict(conversation) for conversation in conversations]
        finally:
            session.close()

    def get_conversation_messages(self, conversation_id: str, user_id: str) -> Dict:
        """Returns a conversation with its ordered messages."""
        session = SessionLocal()
        try:
            conversation = self._get_owned_conversation(session, conversation_id, user_id)
            messages = session.query(AIChatMessage)\
                .filter(AIChatMessage.conversationId == conversation_id)\
                .order_by(AIChatMessage.created_on.asc())\
                .all()
            result = self._conversation_to_dict(conversation)
            result["messages"] = [self._message_to_dict(message, include_database=False) for message in messages]
            return result
        finally:
            session.close()

    def update_conversation(self, conversation_id: str, user_id: str, title: Optional[str], is_pinned: Optional[bool]) -> Dict:
        """Updates editable conversation metadata."""
        session = SessionLocal()
        try:
            conversation = self._get_owned_conversation(session, conversation_id, user_id)
            if title is not None:
                conversation.title = title
            if is_pinned is not None:
                conversation.isPinned = is_pinned
            conversation.changed_on = datetime.datetime.utcnow()
            session.commit()
            return {"message": "Conversation updated successfully"}
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def delete_conversation(self, conversation_id: str, user_id: str) -> Dict:
        """Deletes a conversation owned by the user."""
        session = SessionLocal()
        try:
            conversation = self._get_owned_conversation(session, conversation_id, user_id)
            session.delete(conversation)
            session.commit()
            return {"message": "Conversation deleted successfully"}
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def submit_feedback(self, user_id: str, message_id: str, rating: int, correction: str = "", conversation_id: Optional[str] = None) -> Dict:
        """Creates or updates feedback on an AI response."""
        if rating not in [1, -1]:
            raise HTTPException(status_code=400, detail="rating (1 or -1) is required")

        session = SessionLocal()
        try:
            existing = session.query(AIFeedback).filter_by(messageId=message_id, userId=user_id).first()
            if existing:
                existing.rating = rating
                existing.correction = correction if rating == -1 else None
            else:
                session.add(AIFeedback(
                    id=str(uuid.uuid4()),
                    messageId=message_id,
                    conversationId=conversation_id,
                    userId=user_id,
                    rating=rating,
                    correction=correction if rating == -1 else None,
                ))
            session.commit()
            return {"message": "Feedback saved", "rating": rating}
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()

    def _get_owned_conversation(self, session, conversation_id: str, user_id: str) -> AIConversation:
        conversation = session.query(AIConversation).get(conversation_id)
        if not conversation or conversation.userId != user_id:
            raise HTTPException(status_code=404, detail="Conversation not found")
        return conversation

    def _title_from_text(self, text: str) -> str:
        return text[:50] + ("..." if len(text) > 50 else "")

    def _message_to_dict(self, message: AIChatMessage, include_database: bool = True) -> Dict:
        result = {
            "id": message.id,
            "role": message.role,
            "content": message.content,
            "created_on": message.created_on.isoformat(),
        }
        if include_database:
            result["databaseId"] = message.databaseId
        return result

    def _conversation_to_dict(self, conversation: AIConversation) -> Dict:
        return {
            "id": conversation.id,
            "title": conversation.title,
            "isPinned": conversation.isPinned,
            "databaseId": conversation.databaseId,
            "created_on": conversation.created_on.isoformat(),
            "changed_on": conversation.changed_on.isoformat(),
        }


conversation_store = AIConversationStore()
