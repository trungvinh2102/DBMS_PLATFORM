"""
test_ai_autocomplete_schema.py

Regression tests for AI autocomplete request compatibility.
"""

from schemas.ai import CompleteSqlRequest


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
