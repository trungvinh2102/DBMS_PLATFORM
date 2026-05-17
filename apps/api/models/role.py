"""
role.py

SQLAlchemy model for user roles in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Column, DateTime, String, Text

from models.base import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
