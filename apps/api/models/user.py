"""
user.py

SQLAlchemy model for application users in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import relationship

from .base import Base


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String)
    avatarUrl = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    roleId = Column(String, ForeignKey("roles.id"), nullable=False)
    role = relationship("Role")
    settings = relationship("UserSetting", uselist=False, back_populates="user")
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
