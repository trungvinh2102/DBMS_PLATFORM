"""
test_schema_diff_service.py

Regression tests for schema diff comparison and migration script generation.
"""

from unittest.mock import MagicMock

from services.schema_diff_service import schema_diff_service


def test_schema_diff_generates_add_column_script(mocker):
    """A source-only column should produce a safe ALTER TABLE ADD COLUMN script."""
    mocker.patch.object(schema_diff_service, "_get_database_type", return_value="postgresql")
    mocker.patch("services.schema_diff_service.metadata_service.get_tables", return_value=["users"])
    mocker.patch(
        "services.schema_diff_service.metadata_service.get_all_columns",
        side_effect=[
            {"users": [{"name": "id", "type": "integer", "nullable": False}, {"name": "email", "type": "text", "nullable": False}]},
            {"users": [{"name": "id", "type": "integer", "nullable": False}]},
        ],
    )
    mocker.patch("services.schema_diff_service.metadata_service.get_indexes", return_value=[])
    mocker.patch("services.schema_diff_service.metadata_service.get_foreign_keys", return_value=[])
    mocker.patch("services.schema_diff_service.metadata_service.get_table_ddl", return_value='CREATE TABLE "users" ("id" integer);')

    result = schema_diff_service.compare("source", "target", "public", "public")

    assert result.summary.added == 1
    assert result.operations[0].objectType == "column"
    assert 'ALTER TABLE "public"."users" ADD COLUMN "email" text NOT NULL;' in result.migrationScript


def test_schema_diff_comments_destructive_operations_by_default(mocker):
    """Destructive drops should be visible but commented out unless explicitly included."""
    mocker.patch.object(schema_diff_service, "_get_database_type", return_value="postgresql")
    mocker.patch("services.schema_diff_service.metadata_service.get_tables", side_effect=[[], ["legacy"]])
    mocker.patch("services.schema_diff_service.metadata_service.get_all_columns", return_value={})
    mocker.patch("services.schema_diff_service.metadata_service.get_indexes", return_value=[])
    mocker.patch("services.schema_diff_service.metadata_service.get_foreign_keys", return_value=[])
    mocker.patch("services.schema_diff_service.metadata_service.get_table_ddl", return_value="")

    result = schema_diff_service.compare("source", "target", "public", "public")

    assert result.summary.destructive == 1
    assert "-- DROP TABLE" in result.migrationScript


def test_schema_diff_route_returns_response(client, mocker):
    """The FastAPI endpoint should expose the structured diff response."""
    response_payload = {
        "sourceDatabaseId": "source",
        "targetDatabaseId": "target",
        "sourceSchema": "public",
        "targetSchema": "public",
        "targetDialect": "postgresql",
        "operations": [],
        "summary": {
            "added": 0,
            "removed": 0,
            "modified": 0,
            "safe": 0,
            "review": 0,
            "destructive": 0,
            "total": 0,
        },
        "migrationScript": "-- no changes\n",
        "warnings": [],
    }
    mocked_compare = mocker.patch("routes.schema_diff_routes.schema_diff_service.compare", return_value=response_payload)

    response = client.post(
        "/api/database/schema-diff",
        json={
            "sourceDatabaseId": "source",
            "targetDatabaseId": "target",
            "sourceSchema": "public",
            "targetSchema": "public",
        },
    )

    assert response.status_code == 200
    assert response.json["summary"]["total"] == 0
    mocked_compare.assert_called_once()
