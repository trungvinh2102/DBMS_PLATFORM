"""
db.py

SQLAlchemy model for saved database connections in QurioDB metadata storage.
"""

import datetime

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, JSON, String
from sqlalchemy.dialects.postgresql import ARRAY

from .base import Base
from .enums import Environment, SSLMode


class Db(Base):
    __tablename__ = "databases"

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)
    environment = Column(Enum(Environment, name="Environment"), default=Environment.DEVELOPMENT)
    isReadOnly = Column(Boolean, default=False)
    sslMode = Column(Enum(SSLMode, name="SSLMode"), default=SSLMode.DISABLE)
    sshConfig = Column(JSON, nullable=True)
    tags = Column(JSON().with_variant(ARRAY(String), "postgresql"), nullable=True)
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    databaseName = Column(String, nullable=False)
    host = Column(String, nullable=True)
    port = Column(Integer, nullable=True)
    config = Column(JSON, nullable=False)
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
