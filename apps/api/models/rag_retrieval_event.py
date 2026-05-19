"""
rag_retrieval_event.py

SQLAlchemy model for safe local RAG retrieval telemetry.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base


class RagRetrievalEvent(Base):
    __tablename__ = "rag_retrieval_events"

    id = Column(String, primary_key=True)
    conversationId = Column(String, ForeignKey("ai_conversations.id", ondelete="SET NULL"), nullable=True)
    messageId = Column(String, ForeignKey("ai_chat_messages.id", ondelete="SET NULL"), nullable=True)
    databaseId = Column(String, ForeignKey("databases.id", ondelete="SET NULL"), nullable=True)
    queryTextHash = Column(String, nullable=False)
    retrievalMode = Column(String, nullable=False)
    candidateCount = Column(Integer, default=0)
    selectedCount = Column(Integer, default=0)
    latencyMs = Column(Integer, default=0)
    trace = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
