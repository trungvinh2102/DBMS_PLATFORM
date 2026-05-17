"""
ai_generated_query.py

SQLAlchemy model for AI-generated SQL queries in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text

from models.base import Base


class AIGeneratedQuery(Base):
    __tablename__ = "ai_generated_queries"

    id = Column(String, primary_key=True)
    prompt = Column(Text, nullable=True)
    sql = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    userId = Column(String, ForeignKey("users.id"), nullable=True)
    databaseId = Column(String, ForeignKey("databases.id"), nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
