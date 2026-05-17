"""
models

Public exports for QurioDB metadata database models and database session helpers.
"""

from models.ai_chat_message import AIChatMessage
from models.ai_conversation import AIConversation
from models.ai_feedback import AIFeedback
from models.ai_generated_query import AIGeneratedQuery
from models.ai_model import AIModel
from models.base import Base
from models.database import DATABASE_URL, SessionLocal, engine
from models.db import Db
from models.enums import Environment, SSLMode
from models.query_history import QueryHistory
from models.role import Role
from models.saved_query import SavedQuery
from models.schema_embedding import SchemaEmbedding
from models.user import User
from models.user_ai_config import UserAIConfig
from models.user_setting import UserSetting

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
