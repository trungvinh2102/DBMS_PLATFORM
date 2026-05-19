"""
rag_embedding.py

SQLAlchemy model for provider metadata and vectors attached to RAG chunks.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base


class RagEmbedding(Base):
    __tablename__ = "rag_embeddings"

    id = Column(String, primary_key=True)
    chunkId = Column(String, ForeignKey("rag_chunks.id", ondelete="CASCADE"), nullable=False)
    embeddingModel = Column(String, nullable=False)
    embeddingProvider = Column(String, nullable=False)
    dimensions = Column(Integer, nullable=False)
    vectorJson = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
