"""
test_ai_diagnostics.py

Regression tests for local AI observability diagnostics.
"""

import datetime

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import routes.ai_diagnostics as diagnostics_module
from models import Base, RagRetrievalEvent

pytestmark = pytest.mark.rag


def test_ai_diagnostics_returns_safe_trace_summary(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)
    monkeypatch.setattr(diagnostics_module, "SessionLocal", factory)

    session = factory()
    try:
        session.add(RagRetrievalEvent(
            id="event-1",
            databaseId="db-1",
            queryTextHash="hash",
            retrievalMode="hybrid",
            candidateCount=12,
            selectedCount=2,
            latencyMs=40,
            trace={
                "fallbackReason": "",
                "items": [{
                    "sourceType": "database_schema",
                    "title": "orders",
                    "score": 0.9,
                    "content": "must not be exposed",
                    "citation": {"id": "database:db-1/schema:public/table:orders"},
                }],
            },
            created_on=datetime.datetime(2026, 5, 19),
        ))
        session.commit()
    finally:
        session.close()

    result = diagnostics_module.get_ai_diagnostics(databaseId="db-1", current_user={"userId": "user-1"})

    assert result["summary"]["eventCount"] == 1
    assert result["summary"]["avgLatencyMs"] == 40
    assert result["events"][0]["items"][0]["citation"] == "database:db-1/schema:public/table:orders"
    assert "content" not in result["events"][0]["items"][0]
