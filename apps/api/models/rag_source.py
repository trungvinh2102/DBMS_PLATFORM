"""
rag_source.py

SQLAlchemy model for logical sources indexed by QurioDB's generalized RAG layer.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String

from .base import Base


class RagSource(Base):
    __tablename__ = "rag_sources"

    id = Column(String, primary_key=True)
    sourceType = Column(String, nullable=False)
    databaseId = Column(String, ForeignKey("databases.id", ondelete="CASCADE"), nullable=True)
    userId = Column(String, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    title = Column(String, nullable=False)
    uri = Column(String, nullable=True)
    contentHash = Column(String, nullable=False)
    accessScope = Column(String, default="database")
    status = Column(String, default="pending")
    indexed_on = Column(DateTime, nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
