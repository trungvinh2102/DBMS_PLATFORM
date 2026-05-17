"""
database.py

SQLAlchemy engine and session initialization for QurioDB's local metadata
database.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker


def init_engine():
    """Create the metadata database engine for desktop-first zero setup."""
    os.environ.pop("DATABASE_URL", None)
    url = _load_database_url()

    if not url:
        url = _default_sqlite_url()

    print("Backend: Data source initialized successfully.")
    metadata_engine = create_engine(
        url,
        connect_args={"check_same_thread": False} if url.startswith("sqlite") else {},
    )

    if url.startswith("sqlite"):
        _enable_sqlite_wal(metadata_engine)

    return metadata_engine, url


def _load_database_url():
    models_dir = os.path.dirname(os.path.abspath(__file__))
    api_env = os.path.join(os.path.dirname(models_dir), ".env")
    if not os.path.exists(api_env):
        return None

    load_dotenv(api_env, override=True)
    url = os.getenv("DATABASE_URL")
    return url.strip() if url and url.strip() else None


def _default_sqlite_url():
    data_dir = Path.home() / ".quriodb"
    try:
        data_dir.mkdir(parents=True, exist_ok=True)
        db_path = (data_dir / "quriodb.db").resolve()
        db_path_str = str(db_path).replace("\\", "/")
        print(f"Backend: Zero-Setup SQLite enabled at: {db_path_str}")
        return f"sqlite:///{db_path_str}"
    except Exception as exc:
        print(f"Backend Warning: Could not use home directory ({exc}), falling back to relative path.")
        return "sqlite:///quriodb.db"


def _enable_sqlite_wal(metadata_engine):
    @event.listens_for(metadata_engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()


try:
    engine, DATABASE_URL = init_engine()
except Exception as exc:
    print(f"CRITICAL: Failed to initialize database engine: {exc}")
    engine = None
    DATABASE_URL = None


def SessionLocal():
    """Return a new SQLAlchemy session bound to the metadata engine."""
    if engine is None:
        return None

    session_factory = sessionmaker(bind=engine)
    return session_factory()
