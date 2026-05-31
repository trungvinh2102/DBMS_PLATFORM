"""
test_nosql_execution.py

Regression tests for MongoDB and Redis execution helpers.
"""

from unittest.mock import MagicMock

import pytest

from services.execution.mongo_executor import MongoExecutor
from services.execution.redis_executor import RedisExecutor


def test_mongo_executor_supports_get_collection_aggregate(monkeypatch):
    service = MagicMock()
    service.get_db_config.return_value = ("mongodb", {"database": "analytics"})
    collection = MagicMock()
    collection.aggregate.return_value = [{"_id": "paid", "count": 3}]
    db = {"orders-2026": collection}
    client = {"analytics": db}
    service.get_mongo_client.return_value = (client, "analytics")

    session = MagicMock()
    monkeypatch.setattr("services.execution.mongo_executor.SessionLocal", lambda: session)

    data, columns = MongoExecutor(service).execute(
        "db1",
        'db.getCollection("orders-2026").aggregate([{"$group":{"_id":"$status","count":{"$sum":1}}}])',
        100,
    )

    assert data == [{"_id": "paid", "count": 3}]
    assert columns == ["_id", "count"]
    collection.aggregate.assert_called_once()
    session.close.assert_called_once()


def test_mongo_executor_requires_aggregate_pipeline_array():
    executor = MongoExecutor(MagicMock())
    method = MagicMock()

    with pytest.raises(Exception, match="pipeline array"):
        executor._run_operation(method, "aggregate", "aggregate", [{"$match": {}}], 100, MagicMock(), "db")


def test_redis_executor_formats_scan_results_as_key_rows():
    executor = RedisExecutor(MagicMock())

    data, columns = executor._process_result("SCAN", ("0", ["user:1", "user:2"]), 1)

    assert columns == ["cursor", "key"]
    assert data == [{"cursor": "0", "key": "user:1"}]
