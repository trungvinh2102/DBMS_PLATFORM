"""
user_setting.py

SQLAlchemy model for per-user settings in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, JSON, String
from sqlalchemy.orm import relationship

from .base import Base


class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    settings = Column(JSON)
    user = relationship("User", back_populates="settings")
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
