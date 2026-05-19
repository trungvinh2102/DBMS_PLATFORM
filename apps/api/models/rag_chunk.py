"""
rag_chunk.py

SQLAlchemy model for searchable chunks in QurioDB's generalized RAG index.
"""

from sqlalchemy import Column, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from .base import Base


class RagChunk(Base):
    __tablename__ = "rag_chunks"

    id = Column(String, primary_key=True)
    sourceId = Column(String, ForeignKey("rag_sources.id", ondelete="CASCADE"), nullable=False)
    chunkType = Column(String, nullable=False)
    objectName = Column(String, nullable=True)
    schemaName = Column(String, nullable=True)
    content = Column(Text, nullable=False)
    metadataJson = Column(JSON().with_variant(JSONB, "postgresql"), nullable=True)
    tokenCount = Column(Integer, default=0)
    ordinal = Column(Integer, default=0)
    contentHash = Column(String, nullable=False)
