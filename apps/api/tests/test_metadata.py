"""
backend/tests/test_metadata.py

Tests for metadata fetching (schemas, tables, columns).
"""

from unittest.mock import MagicMock
import pytest

from services.metadata.admin_actions import SqlAdminActionProvider
from services.metadata.engine_objects import SqlEngineObjectProvider

def test_get_tables(client, mock_session, mock_engine, mocker):
    """Test fetching tables returns table names."""
    _, mock_conn = mock_engine
    
    # Setup mock DB config retrieval
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {"user": "u", "password": "p"}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    # Mock SQLAlchemy inspect
    mock_inspect = mocker.patch("services.metadata.sql_provider.inspect")
    mock_inspector = mock_inspect.return_value
    mock_inspector.get_table_names.return_value = ["table1", "table2"]
    
    response = client.get('/api/database/tables?databaseId=123&schema=public')
    assert response.status_code == 200
    assert response.json == ["table1", "table2"]

def test_get_columns(client, mock_session, mock_engine, mocker):
    """Test fetching columns maps types correctly."""
    _, mock_conn = mock_engine
    
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    # Mock SQLAlchemy inspect
    mock_inspect = mocker.patch("services.metadata.sql_provider.inspect")
    mock_inspector = mock_inspect.return_value
    mock_inspector.get_columns.return_value = [
        {"name": "id", "type": "INTEGER", "nullable": False},
        {"name": "name", "type": "TEXT", "nullable": True}
    ]
    
    response = client.get('/api/database/columns?databaseId=1&table=users')
    assert response.status_code == 200
    cols = response.json
    assert len(cols) == 2
    assert cols[0]['name'] == "id"
    assert cols[0]['nullable'] is False
    assert cols[1]['name'] == "name" 
    assert cols[1]['nullable'] is True

def test_postgres_engine_object_provider_lists_sequences_and_partitions():
    """Engine-specific provider should expose PostgreSQL objects beyond tables."""
    conn = MagicMock()
    conn.dialect.name = "postgresql"
    conn.execute.return_value.fetchall.side_effect = [
        [("order_id_seq",), ("invoice_id_seq",)],
        [("orders.orders_2026",)],
    ]

    service = MagicMock()
    service.run_dynamic_query.side_effect = lambda _db_id, op: op(conn)
    provider = SqlEngineObjectProvider(service)

    assert provider.get_sequences("db-1", "public") == [
        "order_id_seq",
        "invoice_id_seq",
    ]
    assert provider.get_partitions("db-1", "public") == ["orders.orders_2026"]

def test_engine_specific_metadata_routes(client, mocker):
    """Metadata API should expose the new engine-specific object collections."""
    mocker.patch(
        "routes.metadata_routes.metadata_service.get_materialized_views",
        return_value=["sales_mv"],
    )
    mocker.patch("routes.metadata_routes.metadata_service.get_sequences", return_value=["sales_seq"])
    mocker.patch("routes.metadata_routes.metadata_service.get_roles", return_value=["analyst"])

    assert client.get("/api/database/materialized-views?databaseId=1&schema=public").json == [
        "sales_mv"
    ]
    assert client.get("/api/database/sequences?databaseId=1&schema=public").json == [
        "sales_seq"
    ]
    assert client.get("/api/database/roles?databaseId=1").json == ["analyst"]

def test_postgres_admin_action_provider_previews_refresh_and_sequence_restart():
    """Admin action provider should generate allowlisted PostgreSQL statements."""
    conn = MagicMock()
    conn.dialect.name = "postgresql"

    service = MagicMock()
    service.run_dynamic_query.side_effect = lambda _db_id, op: op(conn)
    provider = SqlAdminActionProvider(service)

    refresh = provider.run_action(
        "db-1",
        "materialized_view",
        "sales_mv",
        "refresh",
        "public",
        {},
        False,
        None,
    )
    restart = provider.run_action(
        "db-1",
        "sequence",
        "sales_seq",
        "restart_with",
        "public",
        {"restartWith": 10},
        False,
        None,
    )

    assert refresh["sql"] == 'REFRESH MATERIALIZED VIEW "public"."sales_mv";'
    assert restart["sql"] == 'ALTER SEQUENCE "public"."sales_seq" RESTART WITH 10;'

def test_admin_action_provider_requires_confirmation_for_execution():
    """Admin actions should not execute unless the explicit token is provided."""
    conn = MagicMock()
    conn.dialect.name = "postgresql"

    service = MagicMock()
    service.run_dynamic_query.side_effect = lambda _db_id, op: op(conn)
    provider = SqlAdminActionProvider(service)

    with pytest.raises(ValueError, match="confirmation token"):
        provider.run_action(
            "db-1",
            "materialized_view",
            "sales_mv",
            "refresh",
            "public",
            {},
            True,
            None,
        )

def test_admin_action_route_returns_preview(client, mocker):
    """Metadata API should expose guarded admin action previews."""
    mocker.patch(
        "routes.metadata_routes.metadata_service.run_admin_action",
        return_value={
            "action": "refresh",
            "objectType": "materialized_view",
            "objectName": "sales_mv",
            "dialect": "postgresql",
            "sql": 'REFRESH MATERIALIZED VIEW "public"."sales_mv";',
            "riskLevel": "medium",
            "requiresConfirmation": True,
            "executed": False,
            "columns": [],
            "data": [],
            "message": "Review the generated SQL before executing.",
        },
    )

    response = client.post(
        "/api/database/admin-action",
        json={
            "databaseId": "1",
            "objectType": "materialized_view",
            "objectName": "sales_mv",
            "action": "refresh",
            "schemaName": "public",
        },
    )

    assert response.status_code == 200
    assert response.json["sql"] == 'REFRESH MATERIALIZED VIEW "public"."sales_mv";'

def test_admin_action_route_requires_admin_role(app, client, mocker):
    """Admin actions should be blocked for non-admin users when auth is enabled."""
    from utils.auth_middleware import get_current_user

    mocker.patch("utils.auth_middleware.DISABLE_AUTH", False)
    app.dependency_overrides[get_current_user] = lambda: {
        "userId": "default-user-id",
        "email": "user@example.com",
        "role": "Default",
        "username": "user",
    }
    service = mocker.patch("routes.metadata_routes.metadata_service.run_admin_action")

    response = client.post(
        "/api/database/admin-action",
        json={
            "databaseId": "1",
            "objectType": "materialized_view",
            "objectName": "sales_mv",
            "action": "refresh",
            "schemaName": "public",
        },
    )

    assert response.status_code == 403
    assert response.json["detail"] == "Admin access required"
    service.assert_not_called()

def test_disable_auth_allows_admin_dependency(mocker):
    """Desktop disable-auth mode should grant full admin access."""
    from utils.auth_middleware import get_admin_user

    mocker.patch("utils.auth_middleware.DISABLE_AUTH", True)
    user = {"userId": "desktop-user", "role": "Default"}

    assert get_admin_user(user) == user
