"""
backend/tests/test_connection.py

Tests for connection service functionality (CRUD, Test).
"""

from unittest.mock import MagicMock
from models.metadata import Db, Environment, SSLMode

def test_list_databases(client, mock_session):
    """Test listing databases returns masked config."""
    # Setup mock data
    db1 = MagicMock(spec=Db)
    db1.id = "1"
    db1.databaseName = "Test DB"
    db1.type = "postgres"
    db1.environment = Environment.DEVELOPMENT
    db1.isReadOnly = False
    db1.sslMode = SSLMode.DISABLE
    db1.config = {"user": "u", "password": "secret_password", "host": "h"}
    
    mock_session.query.return_value.order_by.return_value.all.return_value = [db1]
    
    response = client.get('/api/database/list')
    assert response.status_code == 200
    data = response.json
    assert len(data) == 1
    assert data[0]['databaseName'] == "Test DB"
    assert data[0]['config']['password'] == "********"

def test_create_database(client, mock_session):
    """Test creating a database encrypts password."""
    payload = {
        "databaseName": "New DB",
        "type": "postgres",
        "config": {"user": "u", "password": "plain_password", "host": "h"}
    }
    
    response = client.post('/api/database/create', json=payload)
    assert response.status_code == 200
    
    # verify session add called
    assert mock_session.add.called
    args = mock_session.add.call_args[0][0]
    assert args.databaseName == "New DB"
    # The password saved should NOT be plain_password (it's encrypted)
    assert args.config['password'] != "plain_password" 
    # But response masked
    assert response.json['config']['password'] == "********"

def test_test_connection_success(client, mock_engine):
    """Test connection endpoint returns success on valid connection."""
    _, mock_conn = mock_engine
    
    payload = {
        "type": "postgres",
        "config": {"user": "u", "password": "p", "host": "h"}
    }
    
    response = client.post('/api/database/test', json=payload)
    assert response.status_code == 200
    assert response.json['success'] is True
    
    # Verify we executed SELECT 1
    mock_conn.execute.assert_called_with("SELECT 1")

def test_test_connection_failure(client, mock_engine):
    """Test connection endpoint handles errors gracefully."""
    mock_eng, _ = mock_engine
    # Simulate connect failure
    mock_eng.connect.side_effect = Exception("Connection refused")
    
    payload = {
        "type": "postgres",
        "config": {"user": "u", "password": "p", "host": "h"}
    }
    
    response = client.post('/api/database/test', json=payload)
    assert response.status_code == 200
    assert response.json['success'] is False
    assert "Connection refused" in response.json['message']
