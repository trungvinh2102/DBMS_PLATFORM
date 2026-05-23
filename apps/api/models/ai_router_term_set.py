"""
ai_router_term_set.py

SQLAlchemy model for configurable AI router term groups in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, String, UniqueConstraint

from .base import Base


class AIRouterTermSet(Base):
    __tablename__ = "ai_router_term_sets"
    __table_args__ = (
        UniqueConstraint("key", "databaseId", "userId", name="uq_ai_router_term_sets_scope"),
    )

    id = Column(String, primary_key=True)
    key = Column(String, nullable=False)
    behavior = Column(String, nullable=False)
    intent = Column(String, nullable=False)
    ragMode = Column(String, nullable=False)
    reasoningMode = Column(String, nullable=False)
    defaultWeight = Column(Float, default=1.0)
    enabled = Column(Boolean, default=True)
    systemDefined = Column(Boolean, default=True)
    databaseId = Column(String, ForeignKey("databases.id", ondelete="CASCADE"), nullable=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
