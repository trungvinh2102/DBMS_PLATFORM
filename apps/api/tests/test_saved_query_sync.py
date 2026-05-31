"""
test_saved_query_sync.py

Regression tests for saved query updates used by SQL Lab workspace sync.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, SavedQuery
from services.execution import ExecutionService


def make_execution_session():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    return session_factory()


def test_save_query_updates_existing_record_instead_of_creating_duplicate():
    session = make_execution_session()
    service = ExecutionService()
    try:
        created = service.save_query(
            {
                "name": "Revenue",
                "description": "Initial version",
                "sql": "SELECT 1;",
                "databaseId": "db-1",
                "userId": "user-1",
            },
            session,
        )

        updated = service.save_query(
            {
                "id": created["id"],
                "name": "Revenue",
                "sql": "SELECT 2;",
                "databaseId": "db-1",
                "userId": "user-1",
            },
            session,
        )

        saved_queries = session.query(SavedQuery).all()
        assert updated["id"] == created["id"]
        assert len(saved_queries) == 1
        assert saved_queries[0].sql == "SELECT 2;"
        assert saved_queries[0].description == "Initial version"
    finally:
        session.close()
