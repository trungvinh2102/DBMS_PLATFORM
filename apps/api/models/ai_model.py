"""
ai_model.py

SQLAlchemy model for AI model registry entries in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, String, Text

from .base import Base


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
        model_id = getattr(self, "modelId", "dynamic-model")
        provider = getattr(self, "provider", "Google")
        return {
            "id": self.id,
            "name": getattr(self, "name", "Unnamed"),
            "modelId": model_id,
            "provider": provider,
            "description": getattr(self, "description", "No description available."),
            "status": "Synchronized" if getattr(self, "isActive", True) else "Offline",
            "isActive": getattr(self, "isActive", True),
            "isDefault": getattr(self, "isDefault", False),
            "capabilities": infer_model_capabilities(model_id, provider),
        }


def infer_model_capabilities(model_id: str, provider: str):
    """Infer coarse model capabilities for routing hints without a schema migration."""
    value = (model_id or "").lower()
    normalized_provider = (provider or "").strip().lower()
    is_fast = any(token in value for token in ["flash", "haiku", "mini", "nano", "lite", "plus"])
    is_reasoning = any(token in value for token in ["pro", "sonnet", "opus", "gpt-4", "gpt-5", "o1", "o3", "deepseek"])
    supports_structured = normalized_provider in {"google", "openai", "anthropic"} or "qwen" in value
    supports_tools = normalized_provider in {"google", "openai", "anthropic"} or any(token in value for token in ["qwen", "deepseek"])

    return {
        "supportsStreaming": True,
        "supportsToolCalling": supports_tools,
        "supportsStructuredOutput": supports_structured,
        "supportsJsonMode": supports_structured or normalized_provider in {"qwen", "deepseek"},
        "supportsReasoning": is_reasoning,
        "latencyTier": "fast" if is_fast else "balanced",
        "costTier": "low" if is_fast else "balanced",
    }
