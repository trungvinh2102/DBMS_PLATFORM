"""
execution_approval.py

Process-local, one-time approval capabilities for risky SQL execution.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
import secrets
import threading
import time
from typing import Callable


APPROVAL_TTL_SECONDS = 120


class ExecutionApprovalInvalid(ValueError):
    """Raised when a supplied approval is missing, stale, or bound elsewhere."""


class ExecutionApprovalRequired(ValueError):
    """Raised when a risky request needs its first explicit confirmation."""

    def __init__(self, approval: "ExecutionApproval", decision: object) -> None:
        super().__init__("SQL execution requires confirmation.")
        self.approval = approval
        self.decision = decision

@dataclass(frozen=True)
class ExecutionApproval:
    """An immutable approval bound to one exact execution request."""

    token: str
    user_id: str
    database_id: str
    sql_fingerprint: str
    effective_limit: int
    auto_commit: bool
    expires_at: datetime
    expires_at_monotonic: float


class ExecutionApprovalStore:
    """Owns short-lived approvals for the lifetime of one backend process."""

    def __init__(
        self,
        now: Callable[[], float] = time.monotonic,
        ttl_seconds: int = APPROVAL_TTL_SECONDS,
    ) -> None:
        self._now = now
        self._ttl_seconds = ttl_seconds
        self._lock = threading.Lock()
        self._approvals: dict[str, ExecutionApproval] = {}

    def create(
        self,
        *,
        user_id: str,
        database_id: str,
        sql_fingerprint: str,
        effective_limit: int,
        auto_commit: bool,
    ) -> ExecutionApproval:
        """Issue one approval bound to an exact execution request."""
        issued_at = self._now()
        approval = ExecutionApproval(
            token=secrets.token_urlsafe(32),
            user_id=user_id,
            database_id=database_id,
            sql_fingerprint=sql_fingerprint,
            effective_limit=effective_limit,
            auto_commit=auto_commit,
            expires_at=datetime.now(UTC) + timedelta(seconds=self._ttl_seconds),
            expires_at_monotonic=issued_at + self._ttl_seconds,
        )
        with self._lock:
            self._prune_expired(issued_at)
            self._approvals[approval.token] = approval
        return approval

    def consume(
        self,
        token: str | None,
        *,
        user_id: str,
        database_id: str,
        sql_fingerprint: str,
        effective_limit: int,
        auto_commit: bool,
    ) -> ExecutionApproval:
        """Atomically validate and consume a matching approval."""
        now = self._now()
        with self._lock:
            self._prune_expired(now)
            approval = self._approvals.pop(token, None) if token else None

        if approval is None or not self._matches(
            approval,
            user_id=user_id,
            database_id=database_id,
            sql_fingerprint=sql_fingerprint,
            effective_limit=effective_limit,
            auto_commit=auto_commit,
        ):
            raise ExecutionApprovalInvalid("SQL confirmation is missing, expired, or no longer matches this request.")
        return approval

    def _prune_expired(self, now: float) -> None:
        expired = [
            token
            for token, approval in self._approvals.items()
            if approval.expires_at_monotonic <= now
        ]
        for token in expired:
            del self._approvals[token]

    @staticmethod
    def _matches(
        approval: ExecutionApproval,
        *,
        user_id: str,
        database_id: str,
        sql_fingerprint: str,
        effective_limit: int,
        auto_commit: bool,
    ) -> bool:
        return (
            approval.user_id == user_id
            and approval.database_id == database_id
            and approval.sql_fingerprint == sql_fingerprint
            and approval.effective_limit == effective_limit
            and approval.auto_commit == auto_commit
        )
