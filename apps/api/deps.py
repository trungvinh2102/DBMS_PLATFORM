"""
deps.py

FastAPI dependency providers shared across route modules.
"""

from collections.abc import Generator

from sqlalchemy.orm import Session

from models import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Yield a metadata database session for one request."""
    db = SessionLocal()
    if db is None:
        raise RuntimeError("Database connection failed")

    try:
        yield db
    finally:
        db.close()
