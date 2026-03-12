"""
backend/tests/test_mongodb_extended.py
"""
import pytest
from unittest.mock import MagicMock, patch

@pytest.fixture(autouse=True)
def clear_mongo_cache():
    """Clear the global MongoDB connection cache before each test."""
    from services.base_service import _mongo_cache
    _mongo_cache.clear()
    yield
    _mongo_cache.clear()

def test_mongodb_metadata_sampling(client, mock_session):
    """Test improved document sampling for MongoDB metadata."""
    from services.metadata import metadata_service
    
    # Mock DB config
    db_mock = MagicMock()
    db_mock.type = "mongodb"
    db_mock.config = {"host": "localhost", "database": "test"}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    # Mock MongoClient
    with patch('pymongo.MongoClient') as mock_mongo:
        mock_db = mock_mongo.return_value.__getitem__.return_value
        mock_coll = mock_db.__getitem__.return_value
        # Support the new ping check in get_mongo_client
        mock_mongo.return_value.admin.command.return_value = {"ok": 1}
        
        # Multiple documents with different fields - now using aggregate($sample)
        data = [
            {"_id": 1, "name": "A", "val": 10},
            {"_id": 2, "name": "B", "extra": "foo"}
        ]
        mock_coll.aggregate.return_value = data
        mock_coll.find.return_value.limit.return_value = data
        
        cols = metadata_service.get_columns("123", "public", "coll")
        
        names = [c['name'] for c in cols]
        assert "name" in names
        assert "val" in names
        assert "extra" in names
        assert "_id" in names

def test_mongodb_execution_mql(client, mock_session):
    """Test native MQL execution in SQLLab."""
    from services.execution import execution_service
    
    db_mock = MagicMock()
    db_mock.type = "mongodb"
    db_mock.config = {"host": "localhost", "database": "test"}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    with patch('pymongo.MongoClient') as mock_mongo:
        mock_db = mock_mongo.return_value.__getitem__.return_value
        mock_coll = mock_db.__getitem__.return_value
        # Support the new ping check in get_mongo_client
        mock_mongo.return_value.admin.command.return_value = {"ok": 1}
        
        mock_coll.find.return_value.limit.return_value = [{"_id": "123", "msg": "hello"}]
        
        # Use new MQL syntax
        res = execution_service.execute_query("123", "mycoll.find({\"msg\": \"hello\"})")
        
        assert res['error'] is None
        assert res['data'][0]['msg'] == "hello"
        assert res['columns'] == ["_id", "msg"]
        
        # Verify call was with filter
        mock_coll.find.assert_called_with({"msg": "hello"})

def test_mongodb_execution_aggregate(client, mock_session):
    """Test aggregation pipeline execution."""
    from services.execution import execution_service
    
    db_mock = MagicMock()
    db_mock.type = "mongodb"
    db_mock.config = {"host": "localhost", "database": "test"}
    mock_session.query.return_value.filter.return_value.first.return_value = db_mock
    
    with patch('pymongo.MongoClient') as mock_mongo:
        mock_db = mock_mongo.return_value.__getitem__.return_value
        mock_coll = mock_db.__getitem__.return_value
        # Support the new ping check in get_mongo_client
        mock_mongo.return_value.admin.command.return_value = {"ok": 1}
        
        mock_coll.aggregate.return_value = [{"total": 100}]
        
        res = execution_service.execute_query("123", "mycoll.aggregate([{\"$match\": {}}])")
        
        assert res['error'] is None
        assert res['data'][0]['total'] == 100
        mock_coll.aggregate.assert_called_once()
