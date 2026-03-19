"""
backend/tests/test_metadata.py

Tests for metadata fetching (schemas, tables, columns).
"""

from unittest.mock import MagicMock

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
