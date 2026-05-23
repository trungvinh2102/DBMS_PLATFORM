"""
test_sql_safety.py

Regression tests for AI SQL guardrails used by preview and agent execution.
"""

from services.ai.sql_safety import sql_safety_validator


def test_validator_allows_read_only_sql_and_applies_preview_limit():
    report = sql_safety_validator.validate("SELECT id, email FROM users", max_preview_rows=25)

    assert report.isAllowed is True
    assert report.statementType == "select"
    assert report.limitApplied is True
    assert "LIMIT 25" in report.sanitizedSql


def test_validator_does_not_apply_postgres_limit_to_mssql():
    report = sql_safety_validator.validate("SELECT id, email FROM users", dialect="mssql", max_preview_rows=25)

    assert report.isAllowed is True
    assert report.limitApplied is False
    assert "LIMIT 25" not in report.sanitizedSql


def test_validator_blocks_destructive_sql():
    report = sql_safety_validator.validate("DROP TABLE users")

    assert report.isAllowed is False
    assert report.riskLevel == "high"
    assert report.requiresConfirmation is True
    assert "read-only" in report.blockedReason


def test_validator_blocks_multiple_statements():
    report = sql_safety_validator.validate("SELECT 1; SELECT 2;")

    assert report.isAllowed is False
    assert report.statementType == "multiple"


def test_validator_ignores_keywords_inside_literals_and_comments():
    report = sql_safety_validator.validate("SELECT 'drop table users' AS note -- delete\nFROM audit_log LIMIT 10")

    assert report.isAllowed is True
    assert report.limitApplied is False


def test_validator_blocks_write_keyword_inside_cte():
    report = sql_safety_validator.validate("WITH changed AS (UPDATE users SET role = 'admin' RETURNING id) SELECT * FROM changed")

    assert report.isAllowed is False
    assert "write_or_ddl_detected" in report.warnings


def test_validator_blocks_select_into_and_delay_functions():
    select_into = sql_safety_validator.validate("SELECT * INTO temp_users FROM users")
    delayed = sql_safety_validator.validate("SELECT pg_sleep(10)")

    assert select_into.isAllowed is False
    assert delayed.isAllowed is False
