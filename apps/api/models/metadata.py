
from sqlalchemy import create_engine, Column, String, Integer, Boolean, Text, DateTime, JSON, ForeignKey, Enum
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
import os
import datetime
import enum

Base = declarative_base()

class Environment(enum.Enum):
    PRODUCTION = "PRODUCTION"
    STAGING = "STAGING"
    DEVELOPMENT = "DEVELOPMENT"

class SSLMode(enum.Enum):
    DISABLE = "DISABLE"
    REQUIRE = "REQUIRE"
    VERIFY_CA = "VERIFY_CA"
    VERIFY_FULL = "VERIFY_FULL"

class Db(Base):
    __tablename__ = 'databases'

    id = Column(String, primary_key=True)
    type = Column(String, nullable=False)
    # Using name='Environment' to match Postgres enum type created by Prisma
    environment = Column(Enum(Environment, name="Environment"), default=Environment.DEVELOPMENT)
    isReadOnly = Column(Boolean, default=False)
    sslMode = Column(Enum(SSLMode, name="SSLMode"), default=SSLMode.DISABLE)
    sshConfig = Column(JSON, nullable=True)
    
    # Postgres String[] maps to ARRAY(String)
    tags = Column(ARRAY(String), nullable=True) 
    
    username = Column(String, nullable=True)
    password = Column(String, nullable=True)
    databaseName = Column(String, nullable=False)
    host = Column(String, nullable=True)
    port = Column(Integer, nullable=True)
    
    config = Column(JSON, nullable=False)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class SavedQuery(Base):
    __tablename__ = 'saved_queries'
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    description = Column(String, nullable=True)
    sql = Column(Text, nullable=False)
    databaseId = Column(String, ForeignKey('databases.id'), nullable=False)
    userId = Column(String, ForeignKey('users.id'), nullable=True)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class QueryHistory(Base):
    __tablename__ = 'query_histories'
    
    id = Column(String, primary_key=True)
    sql = Column(Text, nullable=False)
    status = Column(String, nullable=False)
    executionTime = Column(Integer, nullable=True)
    errorMessage = Column(Text, nullable=True)
    databaseId = Column(String, ForeignKey('databases.id'), nullable=False)
    executedAt = Column(DateTime, default=datetime.datetime.utcnow)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class Role(Base):
    __tablename__ = "roles"

    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    description = Column(Text)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    name = Column(String)
    roleId = Column(String, ForeignKey("roles.id"), nullable=False)

    role = relationship("Role")
    settings = relationship("UserSetting", uselist=False, back_populates="user")
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class UserSetting(Base):
    __tablename__ = "user_settings"

    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    settings = Column(JSON)
    
    user = relationship("User", back_populates="settings")
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
   # Fallback or error
   print("Warning: DATABASE_URL not set in environment")

# Prisma uses 'public' schema by default, verify if tables are in public
# If using different schema, need __table_args__ = {"schema": "custom"}

engine = create_engine(DATABASE_URL) if DATABASE_URL else None
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
