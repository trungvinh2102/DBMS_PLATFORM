"""
ai_task_assignment.py

SQLAlchemy model for per-user AI task-to-model routing preferences.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint

from .base import Base


class AITaskAssignment(Base):
    __tablename__ = "ai_task_assignments"
    __table_args__ = (
        UniqueConstraint("userId", "taskKey", "databaseId", name="uq_ai_task_assignments_scope"),
    )

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    taskKey = Column(String, nullable=False)
    databaseId = Column(String, default="__global__", nullable=False)
    modelId = Column(String, ForeignKey("ai_models.modelId", ondelete="SET NULL"), nullable=True)
    fallbackModelId = Column(String, ForeignKey("ai_models.modelId", ondelete="SET NULL"), nullable=True)
    temperature = Column(Float, nullable=True)
    maxTokens = Column(Integer, nullable=True)
    enabled = Column(Boolean, default=True)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    def to_dict(self):
        """Serialize routing preferences for the Settings UI."""
        database_id = getattr(self, "databaseId", "__global__")
        return {
            "id": self.id,
            "taskKey": self.taskKey,
            "databaseId": None if database_id == "__global__" else database_id,
            "modelId": self.modelId,
            "fallbackModelId": self.fallbackModelId,
            "temperature": self.temperature,
            "maxTokens": self.maxTokens,
            "enabled": bool(self.enabled),
            "changed_on": self.changed_on.isoformat() if self.changed_on else None,
        }
