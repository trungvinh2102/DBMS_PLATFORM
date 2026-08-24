"""
test_sql_execution_policy.py

Regression coverage for the server-owned SQL execution policy and its
one-time local approval capabilities.
"""

import pytest

from services.execution.execution_approval import (
    ExecutionApprovalInvalid,
    ExecutionApprovalStore,
)
from services.execution.sql_policy import SqlExecutionPolicy


def test_read_query_is_allowed_with_server_clamped_limit():
    decision = SqlExecutionPolicy(max_read_rows=100).decide(
        "SELECT id FROM users LIMIT 500",
        dialect="postgresql",
        requested_limit=500,
    )

    assert decision.outcome == "allowed"
    assert decision.effective_limit == 100
    assert decision.risk == "read"


def test_values_query_is_allowed():
    decision = SqlExecutionPolicy().decide(
        "VALUES (1), (2)",
        dialect="postgresql",
        requested_limit=10,
    )

    assert decision.outcome == "allowed"
    assert decision.risk == "read"
    assert decision.risk == "read"


def test_write_and_explain_analyze_require_confirmation():
    policy = SqlExecutionPolicy()

    assert policy.decide(
        "UPDATE users SET enabled = true",
        dialect="postgresql",
        requested_limit=10,
    ).outcome == "confirmation_required"
    assert policy.decide(
        "EXPLAIN ANALYZE SELECT * FROM users",
        dialect="postgresql",
        requested_limit=10,
    ).outcome == "confirmation_required"


@pytest.mark.parametrize(
    "sql",
    [
        "SELECT 1; SELECT 2",
        "SELECT pg_sleep(1)",
        "SELECT * INTO archived_users FROM users",
    ],
)
def test_unsafe_queries_are_blocked(sql):
    decision = SqlExecutionPolicy().decide(
        sql,
        dialect="postgresql",
        requested_limit=10,
    )

    assert decision.outcome == "blocked"


def test_approval_consumes_only_exact_unexpired_request():
    clock = [100.0]
    store = ExecutionApprovalStore(now=lambda: clock[0])
    approval = store.create(
        user_id="user-1",
        database_id="database-1",
        sql_fingerprint="fingerprint-1",
        effective_limit=100,
        auto_commit=True,
    )

    consumed = store.consume(
        approval.token,
        user_id="user-1",
        database_id="database-1",
        sql_fingerprint="fingerprint-1",
        effective_limit=100,
        auto_commit=True,
    )

    assert consumed.token == approval.token
    with pytest.raises(ExecutionApprovalInvalid):
        store.consume(
            approval.token,
            user_id="user-1",
            database_id="database-1",
            sql_fingerprint="fingerprint-1",
            effective_limit=100,
            auto_commit=True,
        )


def test_approval_rejects_changed_request_expiration_and_restart():
    clock = [100.0]
    store = ExecutionApprovalStore(now=lambda: clock[0])
    approval = store.create(
        user_id="user-1",
        database_id="database-1",
        sql_fingerprint="fingerprint-1",
        effective_limit=100,
        auto_commit=True,
    )

    with pytest.raises(ExecutionApprovalInvalid):
        store.consume(
            approval.token,
            user_id="user-1",
            database_id="database-1",
            sql_fingerprint="changed-fingerprint",
            effective_limit=100,
            auto_commit=True,
        )

    clock[0] += 121
    with pytest.raises(ExecutionApprovalInvalid):
        store.consume(
            approval.token,
            user_id="user-1",
            database_id="database-1",
            sql_fingerprint="fingerprint-1",
            effective_limit=100,
            auto_commit=True,
        )

    restarted_store = ExecutionApprovalStore(now=lambda: clock[0])
    with pytest.raises(ExecutionApprovalInvalid):
        restarted_store.consume(
            approval.token,
            user_id="user-1",
            database_id="database-1",
            sql_fingerprint="fingerprint-1",
            effective_limit=100,
            auto_commit=True,
        )
