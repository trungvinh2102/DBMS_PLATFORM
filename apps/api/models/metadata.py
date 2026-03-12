
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
import sys
from dotenv import load_dotenv

def init_engine():
    # Attempt 1: Standard load
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    
    # Attempt 2: Next to executable (Tauri/Sidecar)
    if not url:
        exe_dir = os.path.dirname(sys.executable)
        load_dotenv(os.path.join(exe_dir, '.env'))
        load_dotenv(os.path.join(exe_dir, 'api.env'))
        url = os.getenv("DATABASE_URL")
        
    # Attempt 3: Parent directory
    if not url:
        script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        load_dotenv(os.path.join(script_dir, '.env'))
        url = os.getenv("DATABASE_URL")

    if not url:
        # Last resort fallback for local dev if all above fail
        print("WARNING: DATABASE_URL not found in any .env file. Checking hardcoded fallback...")
        url = "postgresql://postgres:postgres@127.0.0.1:5432/dbms_platform"

    print(f"Backend: Connecting to database at {url.split('@')[-1] if '@' in url else 'unknown'}")
    return create_engine(url)

# Initialize engine immediately at module level
try:
    engine = init_engine()
except Exception as e:
    print(f"CRITICAL: Failed to initialize database engine: {e}")
    engine = None

def SessionLocal():
    """Returns a new session. Always ensures binding to avoid 'Could not locate a bind' error."""
    global engine
    if engine is None:
        engine = init_engine()
    
    if engine is None:
        raise Exception("SQLAlchemy Error: DATABASE_URL not found. Engine is not bound.")
        
    # Create a fresh session maker bound to the engine
    factory = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return factory()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
