"""
ai_conversation.py

SQLAlchemy model for AI assistant conversations in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, String
from sqlalchemy.orm import relationship

from models.base import Base


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    databaseId = Column(String, ForeignKey("databases.id"), nullable=True)
    isPinned = Column(Boolean, default=False)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    messages = relationship("AIChatMessage", back_populates="conversation", cascade="all, delete-orphan")
