"""
models

Public exports for QurioDB metadata database models and database session helpers.
"""

from .ai_chat_message import AIChatMessage
from .ai_conversation import AIConversation
from .ai_feedback import AIFeedback
from .ai_generated_query import AIGeneratedQuery
from .ai_model import AIModel
from .base import Base
from .database import DATABASE_URL, SessionLocal, engine
from .db import Db
from .enums import Environment, SSLMode
from .query_history import QueryHistory
from .role import Role
from .saved_query import SavedQuery
from .schema_embedding import SchemaEmbedding
from .user import User
from .user_ai_config import UserAIConfig
from .user_setting import UserSetting

__all__ = [
    "AIChatMessage",
    "AIConversation",
    "AIFeedback",
    "AIGeneratedQuery",
    "AIModel",
    "Base",
    "DATABASE_URL",
    "Db",
    "Environment",
    "QueryHistory",
    "Role",
    "SSLMode",
    "SavedQuery",
    "SchemaEmbedding",
    "SessionLocal",
    "User",
    "UserAIConfig",
    "UserSetting",
    "engine",
]
