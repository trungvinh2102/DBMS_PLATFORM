"""
sql_policy.py

Deterministic server-side classification for relational SQL execution.
"""

from __future__ import annotations

from dataclasses import dataclass
import hashlib
import re
from typing import Literal

from services.ai.sql_safety import sql_safety_validator


SERVER_MAX_READ_ROWS = 1000

_READ_ONLY_STATEMENTS = {"select", "with", "values", "explain"}
_BLOCKED_STATEMENT_TYPES = {"empty", "multiple", "unknown"}
_BLOCKED_PATTERNS = (
    (re.compile(r"\bselect\b[\s\S]+\binto\b", re.IGNORECASE), "SELECT INTO is not supported."),
    (re.compile(r"\b(pg_sleep|sleep|benchmark)\s*\(", re.IGNORECASE), "Delay and benchmark functions are not supported."),
)
_CONFIRMATION_PATTERNS = (
    (re.compile(r"\bexplain\s+analyze\b", re.IGNORECASE), "EXPLAIN ANALYZE can execute the source statement."),
    (re.compile(r"^\s*pragma\b", re.IGNORECASE), "PRAGMA statements require confirmation."),
    (re.compile(r"^\s*(begin|commit|rollback|savepoint|release)\b", re.IGNORECASE), "Transaction control requires confirmation."),
)


@dataclass(frozen=True)
class SqlExecutionDecision:
    """A normalized SQL execution decision made before driver access."""

    outcome: Literal["allowed", "confirmation_required", "blocked"]
    normalized_sql: str
    fingerprint: str
    risk: Literal["read", "write", "destructive", "unknown"]
    reason: str | None
    effective_limit: int


class SqlExecutionPolicy:
    """Allows only proven read SQL without an explicit local confirmation."""

    def __init__(self, max_read_rows: int = SERVER_MAX_READ_ROWS) -> None:
        self.max_read_rows = max(1, min(max_read_rows, SERVER_MAX_READ_ROWS))

    def decide(
        self,
        sql: str,
        dialect: str | None,
        requested_limit: int | None,
    ) -> SqlExecutionDecision:
        """Classify SQL and derive the maximum result size the driver may return."""
        normalized_sql = self._normalize(sql)
        effective_limit = self._effective_limit(requested_limit)
        fingerprint = hashlib.sha256(normalized_sql.encode("utf-8")).hexdigest()
        report = sql_safety_validator.validate(
            normalized_sql,
            dialect=dialect,
            allow_write=False,
            max_preview_rows=self.max_read_rows,
        )

        blocked_reason = self._blocked_reason(normalized_sql, report.statementType, report.blockedReason)
        if blocked_reason:
            return self._decision(
                "blocked",
                normalized_sql,
                fingerprint,
                "unknown",
                blocked_reason,
                effective_limit,
            )

        confirmation_reason = self._confirmation_reason(normalized_sql, report)
        if confirmation_reason:
            return self._decision(
                "confirmation_required",
                normalized_sql,
                fingerprint,
                self._risk_for(report.statementType),
                confirmation_reason,
                effective_limit,
            )

        if report.isAllowed and report.statementType in _READ_ONLY_STATEMENTS:
            return self._decision(
                "allowed",
                normalized_sql,
                fingerprint,
                "read",
                None,
                effective_limit,
            )

        return self._decision(
            "blocked",
            normalized_sql,
            fingerprint,
            "unknown",
            report.blockedReason or "SQL statement type is not supported.",
            effective_limit,
        )

    @staticmethod
    def _normalize(sql: str) -> str:
        return str(sql or "").strip().rstrip(";").strip()

    def _effective_limit(self, requested_limit: int | None) -> int:
        try:
            limit = int(requested_limit or self.max_read_rows)
        except (TypeError, ValueError):
            limit = self.max_read_rows
        return max(1, min(limit, self.max_read_rows))

    @staticmethod
    def _blocked_reason(sql: str, statement_type: str, validator_reason: str) -> str | None:
        if statement_type in _BLOCKED_STATEMENT_TYPES:
            return validator_reason or "SQL statement is not supported."
        for pattern, reason in _BLOCKED_PATTERNS:
            if pattern.search(sql):
                return reason
        return None

    @staticmethod
    def _confirmation_reason(sql: str, report) -> str | None:
        for pattern, reason in _CONFIRMATION_PATTERNS:
            if pattern.search(sql):
                return reason
        if report.requiresConfirmation:
            return report.blockedReason or "SQL execution requires confirmation."
        return None

    @staticmethod
    def _risk_for(statement_type: str) -> Literal["write", "destructive", "unknown"]:
        if statement_type in {"drop", "truncate", "alter", "delete"}:
            return "destructive"
        if statement_type in {"insert", "update", "merge", "replace"}:
            return "write"
        return "unknown"

    @staticmethod
    def _decision(
        outcome: Literal["allowed", "confirmation_required", "blocked"],
        normalized_sql: str,
        fingerprint: str,
        risk: Literal["read", "write", "destructive", "unknown"],
        reason: str | None,
        effective_limit: int,
    ) -> SqlExecutionDecision:
        return SqlExecutionDecision(
            outcome=outcome,
            normalized_sql=normalized_sql,
            fingerprint=fingerprint,
            risk=risk,
            reason=reason,
            effective_limit=effective_limit,
        )
