"""
backend/tests/test_execution.py

Tests for query execution logic.
"""

from unittest.mock import MagicMock

def test_execute_select(client, mock_session, mock_engine):
    """Test executing a SELECT query returns formatted results."""
    _, mock_conn = mock_engine
    
    # Mock DB retrieval
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    # Mock execution result
    mock_result = MagicMock()
    mock_result.returns_rows = True
    mock_result.keys.return_value = ["cnt"]
    mock_result.__iter__.return_value = [{"cnt": 42}] # using dict for row simulation if zip is mocked
    
    # Wait, in the service we use zip(cols, row). So row should be list/tuple
    mock_result.__iter__.return_value = [(42,)]
    
    mock_conn.execution_options.return_value.execute.return_value = mock_result
    
    payload = {"databaseId": "1", "sql": "SELECT COUNT(*) as cnt FROM users"}
    response = client.post('/api/database/execute', json=payload)
    
    assert response.status_code == 200
    res = response.json
    assert res['error'] is None
    assert res['columns'] == ["cnt"]
    assert res['data'][0]['cnt'] == 42
    
    # Verify execution history saved
    # We need to spy on mock_session.add(QueryHistory(...))
    # It might be in a separate session instance in the service
    # So we mocking SessionLocal class in conftest is key.

def test_execute_rejects_multiple_sql_statements(client, mock_session, mock_engine):
    """Relational execution rejects a script before it reaches the driver."""
    _, mock_conn = mock_engine
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock

    response = client.post("/api/database/execute", json={
        "databaseId": "1", "sql": "SELECT * FROM ab_user; SELECT * FROM ab_group;",
    })

    assert response.status_code == 422
    assert response.json["detail"]["code"] == "sql_execution_blocked"
    mock_conn.execution_options.assert_not_called()


def test_execute_update_requires_one_time_confirmation(client, mock_session, mock_engine):
    """Writes cannot reach the driver before server confirmation is consumed."""
    _, mock_conn = mock_engine
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    mock_result = MagicMock()
    mock_result.returns_rows = False
    mock_conn.execution_options.return_value.execute.return_value = mock_result

    payload = {"databaseId": "1", "sql": "UPDATE users SET active=true"}
    first = client.post("/api/database/execute", json=payload)

    assert first.status_code == 409
    detail = first.json["detail"]
    assert detail["code"] == "sql_confirmation_required"
    mock_conn.execution_options.assert_not_called()

    confirmed = client.post("/api/database/execute", json={
        **payload, "confirmationToken": detail["confirmationToken"],
    })
    assert confirmed.status_code == 200
    assert confirmed.json["error"] is None

    replay = client.post("/api/database/execute", json={
        **payload, "confirmationToken": detail["confirmationToken"],
    })
    assert replay.status_code == 409

def test_prepare_sql_clamps_existing_read_limit():
    """A caller cannot bypass the server cap with a larger SQL LIMIT."""
    from services.execution.sql_executor import SqlExecutor

    prepared = SqlExecutor(MagicMock())._prepare_sql(
        "SELECT id FROM users LIMIT 5000",
        limit=100,
        dialect="postgresql",
    )

    assert prepared.endswith("LIMIT 100")


def test_explain_plan_returns_graph(client, mock_session, mock_engine):
    """Test EXPLAIN normalizes a PostgreSQL JSON plan into graph nodes."""
    _, mock_conn = mock_engine

    db_mock = MagicMock()
    db_mock.type = "postgres"
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    mock_conn.engine.dialect.name = "postgresql"

    mock_result = MagicMock()
    mock_result.returns_rows = True
    mock_result.__iter__.return_value = [([
        {
            "Plan": {
                "Node Type": "Seq Scan",
                "Relation Name": "users",
                "Startup Cost": 0.0,
                "Total Cost": 1200.0,
                "Plan Rows": 10000,
                "Actual Total Time": 75.5,
            }
        }
    ],)]
    mock_conn.execute.return_value = mock_result

    response = client.post("/api/database/explain", json={"databaseId": "1", "sql": "SELECT * FROM users"})

    assert response.status_code == 200
    res = response.json
    assert res["dialect"] == "postgresql"
    assert res["graph"]["nodes"][0]["operation"] == "Seq Scan"
    assert res["graph"]["nodes"][0]["relation"] == "users"
    assert "Full scan" in res["graph"]["nodes"][0]["warnings"]
    assert res["summary"]["warningCount"] == 1


def test_explain_plan_parses_postgres_json_string(client, mock_session, mock_engine):
    """PostgreSQL JSON EXPLAIN may come back as text depending on the driver."""
    _, mock_conn = mock_engine

    db_mock = MagicMock()
    db_mock.type = "postgres"
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    mock_conn.engine.dialect.name = "postgresql"

    mock_result = MagicMock()
    mock_result.returns_rows = True
    mock_result.__iter__.return_value = [(
        '[{"Plan":{"Node Type":"Aggregate","Plans":[{"Node Type":"Hash Join","Plans":[{"Node Type":"Seq Scan","Relation Name":"Booking"}]}]}}]',
    )]
    mock_conn.execute.return_value = mock_result

    response = client.post("/api/database/explain", json={"databaseId": "1", "sql": "SELECT 1"})

    assert response.status_code == 200
    res = response.json
    assert res["summary"]["nodeCount"] == 3
    assert res["graph"]["nodes"][0]["operation"] == "Aggregate"
    assert res["graph"]["nodes"][2]["relation"] == "Booking"
