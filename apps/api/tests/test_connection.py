"""
backend/tests/test_connection.py

Tests for connection service functionality (CRUD, Test).
"""

from unittest.mock import MagicMock
from models import Db, Environment, SSLMode

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

def test_create_database(client, mock_session, mock_engine):
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
    assert mock_conn.execute.called
    assert "SELECT 1" in str(mock_conn.execute.call_args[0][0])

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

def test_test_connection_redacts_uri_user_info(client, mock_engine, caplog):
    """Test connection failure redacts URI credentials and user info in response and logs."""
    import logging
    mock_eng, _ = mock_engine
    mock_eng.connect.side_effect = Exception(
        "FATAL: password authentication failed for user alice connecting to postgres://alice:plain_password@db.example:5432/app"
    )

    payload = {
        "type": "postgres",
        "config": {
            "user": "alice",
            "password": "plain_password",
            "host": "db.example",
            "port": 5432,
            "database": "app"
        }
    }

    with caplog.at_level(logging.ERROR):
        response = client.post('/api/database/test', json=payload)
    assert response.status_code == 200
    assert response.json['success'] is False
    msg = response.json['message']
    assert "plain_password" not in msg
    assert "alice:" not in msg
    assert "password authentication failed" in msg

    # Verify log is also sanitized
    log_text = caplog.text
    assert "plain_password" not in log_text
    assert "alice:" not in log_text
    assert "Connection test failed:" in log_text

def test_test_connection_redacts_config_password(client, mock_engine):
    """Test connection failure redacts repeated config password."""
    mock_eng, _ = mock_engine
    mock_eng.connect.side_effect = Exception(
        "Could not connect using password super_secret_pass_123 on host db.internal"
    )

    payload = {
        "type": "postgres",
        "config": {
            "user": "admin",
            "password": "super_secret_pass_123",
            "host": "db.internal"
        }
    }

    response = client.post('/api/database/test', json=payload)
    assert response.status_code == 200
    assert response.json['success'] is False
    msg = response.json['message']
    assert "super_secret_pass_123" not in msg
    assert "Could not connect" in msg
