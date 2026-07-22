"""
test_ai_autocomplete_schema.py

Regression tests for AI autocomplete request compatibility.
"""

from schemas.ai import CompleteSqlRequest
from services.ai_service import ai_service


def test_complete_sql_request_accepts_schema_name():
    request = CompleteSqlRequest(
        databaseId="db-1",
        schema_name="analytics",
        prefix="SELECT",
        suffix="",
    )

    assert request.schema_name == "analytics"


def test_complete_sql_request_accepts_legacy_schema_alias():
    request = CompleteSqlRequest(
        databaseId="db-1",
        schema="public",
        prefix="SELECT",
        suffix="",
    )

    assert request.schema_name == "public"


def test_autocomplete_sql_returns_empty_completion_when_setup_fails(monkeypatch):
    def raise_context_error(*args, **kwargs):
        raise RuntimeError("metadata unavailable")

    monkeypatch.setattr(ai_service, "_format_schema_context", raise_context_error)

    result = ai_service.autocomplete_sql(
        db_id="db-1",
        schema="public",
        prefix="SELECT",
        suffix="",
        user_id="user-1",
    )

    assert result["completion"] == ""
    assert "error" not in result
