"""
ai_model.py

SQLAlchemy model for AI model registry entries in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from models.base import Base


class AIModel(Base):
    __tablename__ = "ai_models"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    modelId = Column(String, unique=True, nullable=False)
    provider = Column(String, default="Google")
    description = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True)
    isDefault = Column(Boolean, default=False)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        """Serialize model metadata while tolerating legacy rows with missing values."""
        return {
            "id": self.id,
            "name": getattr(self, "name", "Unnamed"),
            "modelId": getattr(self, "modelId", "dynamic-model"),
            "provider": getattr(self, "provider", "Google"),
            "description": getattr(self, "description", "No description available."),
            "status": "Synchronized" if getattr(self, "isActive", True) else "Offline",
            "isActive": getattr(self, "isActive", True),
            "isDefault": getattr(self, "isDefault", False),
        }
