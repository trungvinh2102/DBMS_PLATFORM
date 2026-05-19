"""
test_rag_index.py

Regression tests for generalized RAG indexing and retrieval services.
"""

import uuid

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

import services.ai.retrieval.index_service as index_module
import services.ai.retrieval.retrieval_service as retrieval_module
from models import Base, QueryHistory, RagChunk, RagRetrievalEvent, RagSource, SavedQuery
from services.ai.retrieval.index_documents import mask_sql_literals
from services.ai.retrieval.index_service import RagIndexService
from services.ai.retrieval.retrieval_service import RagRetrievalService
from services.ai.retrieval.vector_store import resolve_vector_store_config


@pytest.fixture
def rag_session_factory(monkeypatch):
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine)

    monkeypatch.setattr(index_module, "SessionLocal", factory)
    monkeypatch.setattr(retrieval_module, "SessionLocal", factory)
    return factory


def test_index_database_schema_writes_generalized_sources_and_chunks(rag_session_factory, monkeypatch):
    service = RagIndexService()
    monkeypatch.setattr(service.embeddings, "is_available", lambda: False)
    monkeypatch.setattr(
        service.metadata,
        "get_all_columns",
        lambda *_: {
            "orders": [
                {"name": "id", "type": "INTEGER", "nullable": False},
                {"name": "customer_id", "type": "INTEGER", "nullable": False},
            ],
        },
    )
    monkeypatch.setattr(service.metadata, "get_db_type", lambda *_: "postgresql")
    monkeypatch.setattr(
        service.metadata,
        "get_all_foreign_keys",
        lambda *_: [{
            "table": "orders",
            "column": "customer_id",
            "foreignTable": "customers",
            "foreignColumn": "id",
        }],
    )
    monkeypatch.setattr(service.metadata, "get_indexes_for_tables", lambda *_: {"orders": []})

    result = service.index_database_schema("db-1", "public", user_id="user-1")

    session = rag_session_factory()
    try:
        source = session.get(RagSource, "database_schema:db-1:public")
        chunk = session.query(RagChunk).one()
    finally:
        session.close()

    assert result["sourceType"] == "database_schema"
    assert result["chunkCount"] == 1
    assert source.title == "public schema"
    assert chunk.chunkType == "table"
    assert chunk.metadataJson["citation"] == "database:db-1/schema:public/table:orders"
    assert "customer_id INTEGER required foreign key to customers.id" in chunk.content


def test_rag_retrieve_uses_lexical_fallback_over_generalized_chunks(rag_session_factory, monkeypatch):
    index_service = RagIndexService()
    retrieval_service = RagRetrievalService()
    monkeypatch.setattr(index_service.embeddings, "is_available", lambda: False)
    monkeypatch.setattr(retrieval_service.embeddings, "is_available", lambda: False)
    monkeypatch.setattr(
        index_service.metadata,
        "get_all_columns",
        lambda *_: {
            "customers": [{"name": "email", "type": "TEXT", "nullable": True}],
            "orders": [{"name": "total_amount", "type": "NUMERIC", "nullable": False}],
        },
    )
    monkeypatch.setattr(index_service.metadata, "get_db_type", lambda *_: "postgresql")
    monkeypatch.setattr(index_service.metadata, "get_all_foreign_keys", lambda *_: [])
    monkeypatch.setattr(index_service.metadata, "get_indexes_for_tables", lambda *_: {})
    index_service.index_database_schema("db-1", "public")

    result = retrieval_service.retrieve("show customer email", database_id="db-1", user_id="user-1", top_k=1)

    assert result["items"][0]["objectName"] == "customers"
    assert result["citations"][0]["id"] == "database:db-1/schema:public/table:customers"
    assert result["retrievalTrace"]["retrievalMode"] == "lexical_fallback"


def test_index_saved_queries_respects_user_scope(rag_session_factory, monkeypatch):
    service = RagIndexService()
    monkeypatch.setattr(service.embeddings, "is_available", lambda: False)
    session = rag_session_factory()
    try:
        owned_id = str(uuid.uuid4())
        other_id = str(uuid.uuid4())
        session.add_all([
            SavedQuery(
                id=owned_id,
                name="Revenue by customer",
                sql="SELECT customer_id, SUM(total) FROM orders GROUP BY customer_id",
                databaseId="db-1",
                userId="user-1",
            ),
            SavedQuery(
                id=other_id,
                name="Private salaries",
                sql="SELECT * FROM salaries",
                databaseId="db-1",
                userId="user-2",
            ),
        ])
        session.commit()
    finally:
        session.close()

    result = service.index_saved_queries("db-1", user_id="user-1")

    session = rag_session_factory()
    try:
        sources = session.query(RagSource).all()
        chunks = session.query(RagChunk).all()
    finally:
        session.close()

    assert result["indexedSources"] == 1
    assert [source.id for source in sources] == [f"saved_query:{owned_id}"]
    assert "Revenue by customer" in chunks[0].content
    assert "Private salaries" not in chunks[0].content


def test_index_query_history_masks_literals_and_skips_failed_by_default(rag_session_factory, monkeypatch):
    service = RagIndexService()
    monkeypatch.setattr(service.embeddings, "is_available", lambda: False)
    session = rag_session_factory()
    try:
        success_id = str(uuid.uuid4())
        failed_id = str(uuid.uuid4())
        session.add_all([
            QueryHistory(
                id=success_id,
                sql="SELECT * FROM users WHERE email = 'alice@example.com' AND age > 42",
                status="SUCCESS",
                executionTime=12,
                databaseId="db-1",
            ),
            QueryHistory(
                id=failed_id,
                sql="SELECT * FROM missing_table WHERE secret = 'token'",
                status="FAILED",
                executionTime=1,
                databaseId="db-1",
            ),
        ])
        session.commit()
    finally:
        session.close()

    result = service.index_query_history("db-1")

    session = rag_session_factory()
    try:
        sources = session.query(RagSource).all()
        chunks = session.query(RagChunk).all()
    finally:
        session.close()

    assert result["indexedSources"] == 1
    assert [source.id for source in sources] == [f"query_history:{success_id}"]
    assert "'alice@example.com'" not in chunks[0].content
    assert "age > ?" in chunks[0].content
    assert "missing_table" not in chunks[0].content


def test_mask_sql_literals_replaces_strings_and_numbers():
    assert mask_sql_literals("email = 'a@b.com' AND total >= 99.5") == "email = '?' AND total >= ?"


def test_index_text_source_chunks_markdown_and_retrieves_document(rag_session_factory, monkeypatch):
    index_service = RagIndexService()
    retrieval_service = RagRetrievalService()
    monkeypatch.setattr(index_service.embeddings, "is_available", lambda: False)
    monkeypatch.setattr(retrieval_service.embeddings, "is_available", lambda: False)

    result = index_service.index_text_source(
        "document",
        "Orders Manual",
        "# Orders\nUse orders.total for revenue reporting.\n\n# Customers\nCustomers contain email addresses.",
        database_id="db-1",
        user_id="user-1",
        uri="manual://orders",
        source_id="document:orders-manual",
    )
    retrieval = retrieval_service.retrieve(
        "revenue reporting",
        database_id="db-1",
        user_id="user-1",
        source_types=["document"],
        top_k=1,
    )

    assert result["chunkCount"] == 2
    assert retrieval["items"][0]["title"] == "Orders Manual"
    assert retrieval["citations"][0]["id"] == "document:orders-manual#chunk-0"


def test_get_and_delete_source_respects_visibility(rag_session_factory, monkeypatch):
    index_service = RagIndexService()
    retrieval_service = RagRetrievalService()
    monkeypatch.setattr(index_service.embeddings, "is_available", lambda: False)
    index_service.index_text_source(
        "document",
        "Private Notes",
        "Only owner can delete this source.",
        user_id="user-1",
        source_id="document:private",
    )

    assert retrieval_service.get_source("document:private", user_id="user-2") is None
    assert retrieval_service.delete_source("document:private", user_id="user-2")["reason"] == "forbidden"
    assert retrieval_service.get_source("document:private", user_id="user-1")["chunkCount"] == 1
    assert retrieval_service.delete_source("document:private", user_id="user-1")["deleted"] is True
    assert retrieval_service.get_source("document:private", user_id="user-1") is None


def test_get_retrieval_events_returns_safe_trace(rag_session_factory):
    session = rag_session_factory()
    try:
        session.add(RagRetrievalEvent(
            id="event-1",
            messageId="message-1",
            databaseId="db-1",
            queryTextHash="hash",
            retrievalMode="lexical_fallback",
            candidateCount=3,
            selectedCount=1,
            latencyMs=7,
            trace={"selectedCount": 1},
        ))
        session.commit()
    finally:
        session.close()

    events = RagRetrievalService().get_retrieval_events("message-1")

    assert events[0]["retrievalMode"] == "lexical_fallback"
    assert events[0]["trace"] == {"selectedCount": 1}


def test_vector_store_config_defaults_to_desktop_safe_backend(monkeypatch):
    monkeypatch.delenv("QURIODB_RAG_VECTOR_BACKEND", raising=False)
    monkeypatch.delenv("QURIODB_RAG_ENABLED", raising=False)

    status = resolve_vector_store_config().to_status()

    assert status["backend"] == "sqlite_json"
    assert status["enabled"] is True
    assert status["requiresExternalService"] is False


def test_vector_store_config_sanitizes_unknown_backend(monkeypatch):
    monkeypatch.setenv("QURIODB_RAG_VECTOR_BACKEND", "unknown-cloud")

    assert resolve_vector_store_config().backend == "sqlite_json"
