
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
    
    # Tags handling: Postgres uses ARRAY, others (like SQLite) use JSON or Text
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
    avatarUrl = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
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

class AIConversation(Base):
    __tablename__ = 'ai_conversations'
    
    id = Column(String, primary_key=True)
    title = Column(String, nullable=False)
    userId = Column(String, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    databaseId = Column(String, ForeignKey('databases.id'), nullable=True)
    isPinned = Column(Boolean, default=False)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    
    messages = relationship("AIChatMessage", back_populates="conversation", cascade="all, delete-orphan")

class AIChatMessage(Base):
    __tablename__ = 'ai_chat_messages'
    
    id = Column(String, primary_key=True)
    role = Column(String, nullable=False) # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    userId = Column(String, ForeignKey('users.id'), nullable=True)
    databaseId = Column(String, ForeignKey('databases.id'), nullable=True)
    conversationId = Column(String, ForeignKey('ai_conversations.id', ondelete='CASCADE'), nullable=True)
    
    conversation = relationship("AIConversation", back_populates="messages")
    created_on = Column(DateTime, default=datetime.datetime.utcnow)

class AIGeneratedQuery(Base):
    __tablename__ = 'ai_generated_queries'
    
    id = Column(String, primary_key=True)
    prompt = Column(Text, nullable=True)
    sql = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    userId = Column(String, ForeignKey('users.id'), nullable=True)
    databaseId = Column(String, ForeignKey('databases.id'), nullable=True)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)


class AIModel(Base):
    __tablename__ = 'ai_models'
    
    id = Column(String, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    modelId = Column(String, unique=True, nullable=False) # e.g. 'gemini-1.5-flash'
    provider = Column(String, default="Google")
    description = Column(Text, nullable=True)
    isActive = Column(Boolean, default=True)
    isDefault = Column(Boolean, default=False)
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)

    def to_dict(self):
        """Robust serialization to dictionary, handling missing columns gracefully."""
        return {
            'id': self.id,
            'name': getattr(self, 'name', "Unnamed"),
            'modelId': getattr(self, 'modelId', "dynamic-model"),
            'provider': getattr(self, 'provider', "Google"),
            'description': getattr(self, 'description', "No description available."),
            'status': 'Synchronized' if getattr(self, 'isActive', True) else 'Offline',
            'isActive': getattr(self, 'isActive', True),
            'isDefault': getattr(self, 'isDefault', False)
        }

class UserAIConfig(Base):
    __tablename__ = 'user_ai_configs'
    
    id = Column(String, primary_key=True)
    userId = Column(String, ForeignKey('users.id', ondelete='CASCADE'), unique=True, nullable=False)
    apiKey = Column(String, nullable=False) # Should be encrypted
    provider = Column(String, default="Google")
    
    created_on = Column(DateTime, default=datetime.datetime.utcnow)
    changed_on = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

# Database connection
import sys
from dotenv import load_dotenv

def init_engine():
    # Attempt 1: Standard load from current workdir
    load_dotenv()
    url = os.getenv("DATABASE_URL")
    
    # Attempt 2: Load from apps/api/.env (relative to this file)
    if not url:
        models_dir = os.path.dirname(os.path.abspath(__file__))
        api_dir = os.path.dirname(models_dir)
        api_env = os.path.join(api_dir, '.env')
        if os.path.exists(api_env):
            load_dotenv(api_env, override=True)
            url = os.getenv("DATABASE_URL")
            
    # Attempt 3: Load from root .env (relative to this file)
    if not url:
        root_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        root_env = os.path.join(root_dir, '.env')
        if os.path.exists(root_env):
            load_dotenv(root_env, override=True)
            url = os.getenv("DATABASE_URL")

    # Final cleanup
    if url:
        # Handle cases where the URL might be wrapped in quotes in the .env file
        url = url.strip()
        if (url.startswith('"') and url.endswith('"')) or (url.startswith("'") and url.endswith("'")):
            url = url[1:-1].strip()

    if not url:
        print("WARNING: DATABASE_URL not found in any .env file. Checking hardcoded fallback...")
        # Fallback to SQLite for standalone/portable use
        if getattr(sys, 'frozen', False):
            # If running as an EXE (PyInstaller)
            app_data = os.getenv('APPDATA') or os.path.expanduser('~/AppData/Roaming')
            data_dir = os.path.join(app_data, 'DBMSPlatform')
            
            if not os.path.exists(data_dir):
                os.makedirs(data_dir, exist_ok=True)
            
            db_path = os.path.join(data_dir, 'dbms_platform.db').replace('\\', '/')
            url = f"sqlite:///{db_path}"
        else:
            url = "sqlite:///dbms_platform.db"

    print(f"Backend: Database connection initialized.")
    # Log masked URL for safety
    masked_url = url
    if '@' in url:
        masked_url = '***' + url[url.find('@'):]
    print(f"Backend: Target: {masked_url}")
    
    engine = create_engine(url)
    
    # Test connection
    try:
        with engine.connect() as conn:
            pass
    except Exception as e:
        print(f"WARNING: Database connection failed: {e}")
            
    return engine, url

# Initialize engine immediately at module level
try:
    engine, DATABASE_URL = init_engine()
except Exception as e:
    print(f"CRITICAL: Failed to initialize database engine: {e}")
    engine = None
    DATABASE_URL = None

def SessionLocal():
    if engine is None:
        return None
    Session = sessionmaker(bind=engine)
    return Session()
