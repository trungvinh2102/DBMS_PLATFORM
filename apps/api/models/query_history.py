"""
query_history.py

SQLAlchemy model for executed query history in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text

from .base import Base


class QueryHistory(Base):
    __tablename__ = "query_histories"

    id = Column(String, primary_key=True)
    sql = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    executionTime = Column(Integer, nullable=True)
    errorMessage = Column(Text, nullable=True)
    databaseId = Column(String, ForeignKey("databases.id"), nullable=False)
    executedAt = Column(DateTime, default=datetime.datetime.utcnow)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
