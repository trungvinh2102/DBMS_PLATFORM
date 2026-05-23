"""
ai_router_term.py

SQLAlchemy model for configurable lexical terms used by QurioDB's AI router.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, String, Text, UniqueConstraint

from .base import Base


class AIRouterTerm(Base):
    __tablename__ = "ai_router_terms"
    __table_args__ = (
        UniqueConstraint("termSetId", "normalizedTerm", "matchType", name="uq_ai_router_terms_term"),
        Index("ix_ai_router_terms_set_enabled", "termSetId", "enabled"),
        Index("ix_ai_router_terms_normalized", "normalizedTerm"),
    )

    id = Column(String, primary_key=True)
    termSetId = Column(String, ForeignKey("ai_router_term_sets.id", ondelete="CASCADE"), nullable=False)
    term = Column(String, nullable=False)
    normalizedTerm = Column(String, nullable=False)
    language = Column(String, default="any")
    matchType = Column(String, default="phrase")
    weight = Column(Float, default=1.0)
    isNegative = Column(Boolean, default=False)
    enabled = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
