"""
test_schema_retriever.py

Regression tests for hybrid schema retrieval and RAG prompt context assembly.
"""

from services.ai.context import SchemaContextService
from services.schema_retriever import SchemaRetriever, TableRetrievalResult
from services.ai_service import AIService
from services.ai.retrieval.text import build_table_search_text


def test_retrieve_relevant_tables_uses_lexical_fallback(monkeypatch):
    """Exact table and column terms should work even when embeddings are unavailable."""
    retriever = SchemaRetriever()
    monkeypatch.setattr(retriever, "_load_or_build_embeddings", lambda *_: [])
    monkeypatch.setattr(retriever, "_semantic_scores", lambda *_: {})
    monkeypatch.setattr(
        retriever.metadata,
        "get_all_columns",
        lambda *_: {
            "customers": [
                {"name": "id", "type": "INTEGER", "nullable": False},
                {"name": "email", "type": "TEXT", "nullable": True},
                {"name": "company_name", "type": "TEXT", "nullable": True},
            ],
            "orders": [
                {"name": "id", "type": "INTEGER", "nullable": False},
                {"name": "customer_id", "type": "INTEGER", "nullable": False},
                {"name": "total_amount", "type": "NUMERIC", "nullable": False},
            ],
            "audit_logs": [
                {"name": "event_name", "type": "TEXT", "nullable": True},
            ],
        },
    )
    monkeypatch.setattr(retriever.metadata, "get_db_type", lambda *_: "postgres")
    monkeypatch.setattr(retriever.metadata, "get_all_foreign_keys", lambda *_: [])
    monkeypatch.setattr(retriever.metadata, "get_indexes_for_tables", lambda *_: {})

    results = retriever.retrieve_relevant_tables(
        "db-1",
        "show customer email and revenue from orders",
        "public",
        top_k=2,
    )

    assert [result.table_name for result in results] == ["orders", "customers"]
    assert results[0].lexical_score > 0
    assert "customer" in results[0].matched_terms


def test_schema_context_includes_retrieval_notes_and_fk_neighbors(monkeypatch):
    """Prompt context should expose retrieval evidence and join-neighbor tables."""
    service = SchemaContextService()
    monkeypatch.setattr(
        "services.ai.context.schema_retriever.retrieve_relevant_tables",
        lambda *_args, **_kwargs: [
            TableRetrievalResult("orders", 0.02, 0.0, 6.0, ["order", "customer"])
        ],
    )
    monkeypatch.setattr(
        "services.ai.context.metadata_service.get_all_columns",
        lambda *_: {
            "orders": [
                {"name": "id", "type": "INTEGER", "nullable": False},
                {"name": "customer_id", "type": "INTEGER", "nullable": False},
            ],
            "customers": [
                {"name": "id", "type": "INTEGER", "nullable": False},
                {"name": "email", "type": "TEXT", "nullable": True},
            ],
        },
    )
    monkeypatch.setattr(
        "services.ai.context.metadata_service.get_all_foreign_keys",
        lambda *_: [
            {
                "table": "orders",
                "column": "customer_id",
                "foreignTable": "customers",
                "foreignColumn": "id",
            }
        ],
    )
    monkeypatch.setattr(
        "services.ai.context.BaseDatabaseService.get_db_config",
        lambda *_: ("postgres", {}),
    )
    monkeypatch.setattr(
        "services.ai.context.BaseDatabaseService.run_dynamic_query",
        lambda *_: None,
    )

    context = service.format_schema_context("db-1", "public", intent="orders by customer")

    assert "RETRIEVAL NOTES:" in context
    assert "- orders: score=0.0200" in context
    assert 'CREATE TABLE "orders"' in context
    assert 'CREATE TABLE "customers"' in context
    assert "FOREIGN KEY (customer_id) REFERENCES customers(id)" in context


def test_build_schema_context_returns_safe_retrieval_trace(monkeypatch):
    """Context builder should expose a structured trace alongside prompt text."""
    service = SchemaContextService()
    monkeypatch.setattr(
        "services.ai.context.schema_retriever.retrieve_relevant_tables",
        lambda *_args, **_kwargs: [
            TableRetrievalResult(
                "orders",
                0.03,
                0.01,
                8.0,
                ["order", "total"],
                columns=["id", "total_amount"],
                reasons=["matched table orders", "matched column total"],
            )
        ],
    )
    monkeypatch.setattr(
        "services.ai.context.metadata_service.get_all_columns",
        lambda *_: {
            "orders": [
                {"name": "id", "type": "INTEGER", "nullable": False},
                {"name": "total_amount", "type": "NUMERIC", "nullable": False},
            ],
        },
    )
    monkeypatch.setattr("services.ai.context.metadata_service.get_all_foreign_keys", lambda *_: [])
    monkeypatch.setattr("services.ai.context.BaseDatabaseService.get_db_config", lambda *_: ("postgres", {}))
    monkeypatch.setattr("services.ai.context.BaseDatabaseService.run_dynamic_query", lambda *_: None)

    result = service.build_schema_context("db-1", "public", intent="order totals")

    assert "SCHEMA STRUCTURE:" in result.context
    assert result.retrieval_trace["intent"] == "order totals"
    assert result.retrieval_trace["tables"][0]["name"] == "orders"
    assert result.retrieval_trace["tables"][0]["reasons"] == ["matched table orders", "matched column total"]


def test_table_search_text_includes_foreign_keys_and_indexes():
    """Embedding documents should include FK and index metadata."""
    text = build_table_search_text(
        "orders",
        [
            {"name": "id", "type": "uuid", "nullable": False},
            {"name": "customer_id", "type": "uuid", "nullable": False},
        ],
        db_type="postgresql",
        foreign_keys=[{
            "table": "orders",
            "column": "customer_id",
            "foreignTable": "customers",
            "foreignColumn": "id",
        }],
        indexes=[{"name": "idx_orders_customer_id"}],
    )

    assert "Dialect: postgresql" in text
    assert "customer_id uuid required foreign key to customers.id" in text
    assert "orders.customer_id -> customers.id" in text
    assert "idx_orders_customer_id" in text


def test_stream_response_does_not_emit_retrieval_trace_tool_call(monkeypatch):
    """Streaming chat should keep retrieval trace out of user-visible activity."""
    service = AIService()
    monkeypatch.setattr(
        "services.ai_service.schema_context_service.build_schema_context",
        lambda *_args, **_kwargs: type(
            "ContextResult",
            (),
            {
                "context": "DATABASE DIALECT: POSTGRES",
                "retrieval_trace": {
                    "intent": "orders",
                    "tables": [{"name": "orders", "reasons": ["matched table orders"]}],
                },
            },
        )(),
    )
    monkeypatch.setattr(
        "services.ai_service.feedback_context_service.get_feedback_context",
        lambda *_: "",
    )
    monkeypatch.setattr(
        "services.ai_service.langchain_runtime.stream_text",
        lambda **_: iter(["done"]),
    )

    events = list(service.stream_generate_response("show orders", db_id="db-1", schema="public", history=[]))

    trace_events = [chunk for event, chunk in events if event == "tool_call" and "RetrievalTrace" in chunk]
    assert not trace_events


def test_rewrite_retrieval_intent_uses_previous_sql_for_followups():
    """Follow-up prompts should retrieve against the previous SQL context."""
    service = AIService()

    rewritten = service._rewrite_retrieval_intent(
        "add customer name to that query",
        [{"role": "assistant", "content": "```sql\nSELECT * FROM orders\n```"}],
    )

    assert "Previous SQL context" in rewritten
    assert "FROM orders" in rewritten
