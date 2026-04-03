"""
backend/tests/test_sqlite_duckdb.py

Tests for SQLite and DuckDB specific integration features:
- URI building (with Windows path normalization)
- Skip encryption for file-based databases
- Engine creation with NullPool
"""

import pytest
from unittest.mock import MagicMock, patch
from utils.connection_utils import ConnectionStringBuilder
from services.connection import ConnectionService
from sqlalchemy.pool import NullPool, QueuePool

def test_uri_builder_sqlite_duckdb():
    """Verify URI building and normalization for file-based DBs."""
    # SQLite absolute path (Posix-style)
    uri = ConnectionStringBuilder.build_uri("sqlite", {"database": "/path/to/db.sqlite"})
    assert uri == "sqlite:////path/to/db.sqlite"
    
    # SQLite Windows path (Backslash normalization)
    uri = ConnectionStringBuilder.build_uri("sqlite", {"database": "C:\\Users\\data\\my.db"})
    assert uri == "sqlite:///C:/Users/data/my.db"
    
    # SQLite :memory:
    uri = ConnectionStringBuilder.build_uri("sqlite", {"database": ":memory:"})
    assert uri == "sqlite:///:memory:"
    
    # DuckDB normalization
    uri = ConnectionStringBuilder.build_uri("duckdb", {"database": "D:\\analytics\\data.duckdb"})
    assert uri == "duckdb:///D:/analytics/data.duckdb"
    
    # DuckDB :memory:
    uri = ConnectionStringBuilder.build_uri("duckdb", {"database": ":memory:"})
    assert uri == "duckdb:///:memory:"

@patch('services.connection.ConnectionService._verify_connection')
def test_skip_encryption_file_based(mock_verify, client, mock_session):
    """Verify creating SQLite connection does NOT encrypt the database path."""
    # SQLite creation
    payload_sqlite = {
        "databaseName": "Local SQLite",
        "type": "sqlite",
        "config": {"database": ":memory:"}
    }
    
    response = client.post('/api/database/create', json=payload_sqlite)
    assert response.status_code == 200
    
    # verify session add called with UNENCRYPTED path
    assert mock_session.add.called
    db_obj_sqlite = mock_session.add.call_args_list[0][0][0]
    assert db_obj_sqlite.type == "sqlite"
    assert db_obj_sqlite.config['database'] == ":memory:"
    
    # Postgres creation (should be encrypted)
    payload_pg = {
        "databaseName": "Remote PG",
        "type": "postgres",
        "config": {"user": "u", "password": "plain_password", "host": "h"}
    }
    client.post('/api/database/create', json=payload_pg)
    db_obj_pg = mock_session.add.call_args_list[1][0][0]
    assert db_obj_pg.type == "postgres"
    # Postgres passwords must be encrypted
    assert db_obj_pg.config['password'] != "plain_password"

@patch('services.base_service.create_engine')
def test_engine_pool_type(mock_create_engine):
    """Verify SQLite/DuckDB use NullPool and others use QueuePool."""
    from services.base_service import BaseDatabaseService
    service = BaseDatabaseService()
    
    # Create a mock engine that doesn't have the dispatch attribute
    mock_engine = MagicMock()
    mock_create_engine.return_value = mock_engine
    
    # SQLite -> NullPool
    service.create_connection_engine("sqlite", {"database": ":memory:"})
    args, kwargs = mock_create_engine.call_args
    assert kwargs['poolclass'] == NullPool
    
    # Postgres -> QueuePool
    service.create_connection_engine("postgres", {"host": "localhost", "database": "db"})
    args, kwargs = mock_create_engine.call_args
    assert kwargs['poolclass'] == QueuePool

def test_test_connection_sqlite_working(client, mock_engine):
    """Verify testing SQLite connection success."""
    # mock_engine is a fixture providing a mock engine and connection
    payload = {
        "type": "sqlite",
        "config": {"database": ":memory:"}
    }
    
    response = client.post('/api/database/test', json=payload)
    assert response.status_code == 200
    assert response.json['success'] is True
