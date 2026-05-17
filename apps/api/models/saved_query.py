"""
saved_query.py

SQLAlchemy model for saved SQL queries in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text

from .base import Base


class SavedQuery(Base):
    __tablename__ = "saved_queries"

    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sql = Column(Text, nullable=False)
    databaseId = Column(String, ForeignKey("databases.id"), nullable=False)
    userId = Column(String, ForeignKey("users.id"), nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
