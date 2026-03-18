"""
backend/tests/test_clickhouse.py

Tests for ClickHouse connection and service functionality.
"""

from unittest.mock import MagicMock, patch

def test_clickhouse_connection_engine_creation():
    """Test creating SQLAlchemy engine for ClickHouse."""
    from services.base_service import BaseDatabaseService
    db_service = BaseDatabaseService()
    config = {
        "user": "default",
        "password": "password",
        "host": "localhost",
        "port": 8123,
        "database": "default"
    }
    
    with patch('services.base_service.create_engine') as mock_create_engine:
        db_service.create_connection_engine('clickhouse', config)
        
        # Verify correct connection string
        args, kwargs = mock_create_engine.call_args
        conn_str = args[0]
        assert "clickhousedb://default:password@127.0.0.1:8123/default" in conn_str

def test_clickhouse_connection_with_ssl():
    """Test creating SQLAlchemy engine for ClickHouse with SSL."""
    from services.base_service import BaseDatabaseService
    db_service = BaseDatabaseService()
    config = {
        "user": "default",
        "password": "password",
        "host": "localhost",
        "port": 8443,
        "database": "default",
        "ssl": True
    }
    
    with patch('services.base_service.create_engine') as mock_create_engine:
        db_service.create_connection_engine('clickhouse', config)
        
        # Verify correct connection string with secure=True
        args, kwargs = mock_create_engine.call_args
        conn_str = args[0]
        assert "secure=True" in conn_str

def test_test_connection_clickhouse(client, mock_engine):
    """Test connection endpoint for ClickHouse."""
    mock_eng, mock_conn = mock_engine
    
    payload = {
        "type": "clickhouse",
        "config": {
            "user": "default",
            "password": "password",
            "host": "localhost",
            "port": 8123,
            "database": "default"
        }
    }
    
    response = client.post('/api/database/test', json=payload)
    assert response.status_code == 200
    assert response.json['success'] is True
    
    # Verify we executed SELECT 1
    assert mock_conn.execute.called
    assert "SELECT 1" in str(mock_conn.execute.call_args[0][0])
