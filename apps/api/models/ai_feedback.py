"""
ai_feedback.py

SQLAlchemy model for user feedback on AI assistant responses.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from .base import Base


class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(String, primary_key=True)
    messageId = Column(String, ForeignKey("ai_chat_messages.id", ondelete="CASCADE"), nullable=False)
    conversationId = Column(String, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    rating = Column(Integer, nullable=False)
    correction = Column(Text, nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
