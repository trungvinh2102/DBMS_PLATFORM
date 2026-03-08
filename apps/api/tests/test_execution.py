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

def test_execute_update(client, mock_session, mock_engine):
    """Test executing an UPDATE query handles no rows."""
    _, mock_conn = mock_engine
    
    db_mock = MagicMock()
    db_mock.type = "postgres"
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    mock_result = MagicMock()
    mock_result.returns_rows = False
    
    mock_conn.execution_options.return_value.execute.return_value = mock_result
    
    payload = {"databaseId": "1", "sql": "UPDATE users SET active=true"}
    response = client.post('/api/database/execute', json=payload)
    
    assert response.status_code == 200
    res = response.json
    assert res['data'] == []
    assert res['columns'] == []
    assert res['error'] is None
