"""
backend/tests/test_metadata.py

Tests for metadata fetching (schemas, tables, columns).
"""

from unittest.mock import MagicMock

def test_get_tables(client, mock_session, mock_engine):
    """Test fetching tables returns table names."""
    _, mock_conn = mock_engine
    
    # Setup mock DB config retrieval first
    # We need to mock get_db_config (BaseService) OR just mock the session query behavior
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {"user": "u", "password": "p"}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    # Setup execution result
    mock_result = MagicMock()
    mock_result.__iter__.return_value = [("table1",), ("table2",)]
    mock_conn.execute.return_value = mock_result
    
    response = client.get('/api/database/tables?databaseId=123&schema=public')
    assert response.status_code == 200
    assert response.json == ["table1", "table2"]
    
    # Verify query params
    call_args = mock_conn.execute.call_args
    # First arg is SQL text, second is params
    assert call_args[0][1] == {"schema": "public"}

def test_get_columns(client, mock_session, mock_engine):
    """Test fetching columns maps types correctly."""
    _, mock_conn = mock_engine
    
    db_mock = MagicMock()
    db_mock.type = "postgres"
    db_mock.config = {}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    # Mock result: name, type, is_nullable
    mock_result = MagicMock()
    mock_result.__iter__.return_value = [
        ("id", "integer", "NO"),
        ("name", "text", "YES")
    ]
    mock_conn.execute.return_value = mock_result
    
    response = client.get('/api/database/columns?databaseId=1&table=users')
    assert response.status_code == 200
    cols = response.json
    assert len(cols) == 2
    assert cols[0]['name'] == "id"
    assert cols[0]['nullable'] is False
    assert cols[1]['name'] == "name" 
    assert cols[1]['nullable'] is True
