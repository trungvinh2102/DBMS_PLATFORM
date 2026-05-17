"""
feedback_context.py

Service to retrieve and format user feedback (corrections and positive examples)
to improve AI performance via few-shot prompting.
"""
import logging
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models import AIChatMessage, AIFeedback, SessionLocal

logger = logging.getLogger(__name__)

class FeedbackContextService:
    """Provides formatted feedback examples for AI prompts."""

    def get_feedback_context(self, db_id: str, user_id: str, limit: int = 5) -> str:
        """
        Fetches relevant feedback and corrections for the current database and user.
        Formats them as few-shot examples.
        """
        session = SessionLocal()
        try:
            # 1. Get feedback for this database/user
            # We look for:
            # - Positive feedback (rating=1): "This worked"
            # - Negative feedback with correction (rating=-1, correction exists): "This was wrong, here is the fix"
            feedbacks = session.query(AIFeedback).filter(
                AIFeedback.userId == user_id,
                AIFeedback.rating.in_([1, -1])
            ).order_by(AIFeedback.created_on.desc()).limit(20).all()

            if not feedbacks:
                return ""

            examples = []
            count = 0
            for fb in feedbacks:
                if count >= limit:
                    break

                # Get the assistant message
                assistant_msg = session.query(AIChatMessage).get(fb.messageId)
                if not assistant_msg:
                    continue

                # Filter by databaseId if possible (AIFeedback has conversationId, AIChatMessage has databaseId)
                if assistant_msg.databaseId != db_id:
                    continue

                # Get the preceding user message (the prompt)
                user_msg = session.query(AIChatMessage).filter(
                    AIChatMessage.conversationId == assistant_msg.conversationId,
                    AIChatMessage.created_on < assistant_msg.created_on,
                    AIChatMessage.role == 'user'
                ).order_by(AIChatMessage.created_on.desc()).first()

                if not user_msg:
                    continue

                # Format based on rating
                if fb.rating == 1:
                    examples.append(f"USER PROMPT: {user_msg.content}\nCORRECT SQL: {assistant_msg.content}")
                elif fb.rating == -1 and fb.correction:
                    examples.append(f"USER PROMPT: {user_msg.content}\nINCORRECT RESPONSE: {assistant_msg.content}\nUSER CORRECTION: {fb.correction}")
                
                count += 1

            if not examples:
                return ""

            return "\n\n".join([
                "### RELEVANT FEEDBACK & EXAMPLES FROM PREVIOUS SESSIONS:",
                "Below are examples of how the user expects queries to be handled for this database. Use them to ensure accuracy and follow their style/logic.",
                *examples
            ])

        except Exception as e:
            logger.error(f"Failed to fetch feedback context: {e}")
            return ""
        finally:
            session.close()

feedback_context_service = FeedbackContextService()
