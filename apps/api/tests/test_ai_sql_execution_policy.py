"""Regression coverage for AI execution policy boundaries."""

from unittest.mock import MagicMock

from services.ai.sql_execution import SqlExecutionVerifier


def test_ai_preview_does_not_execute_explain_analyze():
    verifier = SqlExecutionVerifier()
    verifier.sql_executor.execute = MagicMock()

    result = verifier.preview("db-1", "EXPLAIN ANALYZE SELECT * FROM users")

    assert result.ok is False
    verifier.sql_executor.execute.assert_not_called()

def test_agent_does_not_execute_explain_analyze():
    from services.ai.agent import AgentAIService

    service = object.__new__(AgentAIService)
    service._execute_sql_internal = MagicMock()

    state = service._agent_execute_node({
        "sql": "EXPLAIN ANALYZE SELECT * FROM users",
        "agent_res": {},
        "retries": 0,
    })

    assert state["agent_res"]["type"] == "error"
    service._execute_sql_internal.assert_not_called()
