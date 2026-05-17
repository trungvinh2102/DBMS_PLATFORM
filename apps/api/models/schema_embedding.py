"""
schema_embedding.py

SQLAlchemy model for semantic schema embeddings in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String, Text
from sqlalchemy.dialects.postgresql import JSONB

from models.base import Base


class SchemaEmbedding(Base):
    __tablename__ = "schema_embeddings"

    id = Column(String, primary_key=True)
    databaseId = Column(String, ForeignKey("databases.id", ondelete="CASCADE"), nullable=False)
    schema = Column(String, default="public")
    tableName = Column(String, nullable=False)
    tableDescription = Column(Text, nullable=True)
    embedding = Column(JSON().with_variant(JSONB, "postgresql"), nullable=False)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
