"""
ai_chat_message.py

SQLAlchemy model for AI chat messages in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class AIChatMessage(Base):
    __tablename__ = "ai_chat_messages"

    id = Column(String, primary_key=True)
    role = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    userId = Column(String, ForeignKey("users.id"), nullable=True)
    databaseId = Column(String, ForeignKey("databases.id"), nullable=True)
    conversationId = Column(String, ForeignKey("ai_conversations.id", ondelete="CASCADE"), nullable=True)
    conversation = relationship("AIConversation", back_populates="messages")
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
