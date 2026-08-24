# Safe SQL Execution Design

## Purpose

Make SQL execution safe by default without removing the productive SQL Lab workflow. QurioDB must execute read-only SQL immediately, require a deliberate user confirmation for write or destructive SQL, and enforce that decision inside the local FastAPI backend. This is the first vertical slice of the wider desktop-first, local-first product goal.

## Scope

This design covers SQL submitted to the authenticated `/api/database/execute` endpoint, including SQL typed in SQL Lab and SQL produced by AI then explicitly run in SQL Lab. It applies to SQL-backed connectors supported by `ExecutionService`.

It does not change database roles, connection permissions, query cancellation, saved-query ownership, NoSQL command semantics, connection credential storage, schema navigation, or Tauri sidecar lifecycle.

## Current state and problem

The regular execution path accepts a single SQL statement and adds a limit to some `SELECT` statements, but it allows arbitrary DML and DDL. Its `autoCommit` setting controls database transaction behavior only. `sql_safety_validator` already provides a focused lexical safety baseline for AI calls, but generic `/database/execute` does not use it. Therefore a generated `DROP`, `DELETE`, `UPDATE`, or DDL statement can be pasted or surfaced in SQL Lab and run without a confirmation boundary.

## Decision

Create one backend execution-policy boundary and make the execution service call it before reaching a SQL driver. The policy classifies every SQL request into one of these outcomes:

| Outcome | Meaning | Executor behavior |
| --- | --- | --- |
| `allowed` | A single, supported, read-only statement within policy limits. | Execute immediately. |
| `confirmation_required` | A statement can write, alter schema, control a transaction, or cannot be proved read-only. | Do not invoke the driver. Return a short-lived, one-time approval capability. |
| `blocked` | SQL is malformed, contains multiple statements, or matches a prohibited bypass/side-effect construct. | Do not invoke the driver. Return a structured validation error. |

Only a confirmation capability consumed by the backend authorizes a `confirmation_required` execution. UI state, `autoCommit`, prompts, and an AI response never authorize an execution by themselves.

## Backend components

### `SqlExecutionPolicy`

A focused service, extracted from the existing AI safety vocabulary rather than reimplementing a second SQL parser. It accepts the raw SQL, resolved database type, requested row limit, and execution options, then returns a typed decision:

```python
@dataclass(frozen=True)
class SqlExecutionDecision:
    outcome: Literal["allowed", "confirmation_required", "blocked"]
    normalized_sql: str
    fingerprint: str
    risk: Literal["read", "write", "destructive", "unknown"]
    reason: str | None
    effective_limit: int | None
```

Policy rules for the first slice:

- Reject empty input and multiple executable statements.
- Treat `SELECT`, `VALUES`, and non-analyzing `EXPLAIN` as read-only only after the existing mutation/bypass checks pass.
- Treat `EXPLAIN ANALYZE`, DML, DDL, transaction control, privilege commands, mutation CTEs, `SELECT INTO`, and unrecognized statements as `confirmation_required` or `blocked` where the existing validator proves a bypass.
- Preserve the existing protection for comments/literals, delay functions, and multi-statement attempts.
- Apply a server-owned maximum read limit. A caller can request a lower limit; a higher or missing value is clamped. A `SELECT` containing its own higher `LIMIT` must not bypass the maximum.
- Never infer that an arbitrary dialect-specific function or pragma is safe. Unknown side-effect-capable syntax requires confirmation.

The policy makes a conservative classification; it does not claim to replace connector/database permissions.

### `ExecutionApprovalStore`

An in-memory, process-local store in the API sidecar owns pending confirmations. It is intentionally not persisted: restarting the local backend invalidates approvals and requires the user to review the query again.

On the first `confirmation_required` request, it creates a cryptographically random opaque token with this immutable binding:

```text
user ID + database ID + normalized SQL fingerprint + effective row limit
+ auto-commit setting + creation time + expiration + unused state
```

The token is valid for 120 seconds and can be consumed exactly once. The store must atomically validate all bindings and mark the token used before execution begins. Missing, expired, replayed, altered, or mismatched tokens receive a confirmation error and never reach a driver. The store prunes expired entries during create/consume operations; no background worker is needed.

### Endpoint contract

`ExecuteQueryRequest` gains optional `confirmationToken: str | None`. `/api/database/execute` maintains its normal successful response contract.
The route must also pass the authenticated current user's ID into `ExecutionService.execute_query`; the service must never accept a caller-supplied user ID for approval binding.


For a first dangerous request with no valid token, the endpoint responds HTTP `409 Conflict` with a structured detail:

```json
{
  "code": "sql_confirmation_required",
  "confirmationToken": "opaque one-time token",
  "expiresAt": "2026-08-24T12:34:56Z",
  "risk": "destructive",
  "reason": "DROP statements can permanently remove schema objects"
}
```

It must not execute SQL or write query history for this pre-confirmation response. A rejected/expired/replayed token also returns HTTP 409 with an explicit code but no new token. Blocked SQL returns HTTP 422 with a machine-readable policy code and reason.

`ExecutionService.execute_query` becomes responsible for resolving the user/database context, asking policy for a decision, consuming a valid approval when required, and only then delegating to the current executor. All direct SQL entry points must converge on this service; no route or AI helper may call a SQL driver around the policy.

### AI boundary

`AgentAIService` remains read-only: it validates generated SQL with write permission disabled and receives no confirmation token input. Generation, explain, optimize, and fix operations can return SQL but cannot execute write SQL. SQL output sent by a user to normal SQL Lab execution is evaluated by the same `SqlExecutionPolicy` as manually written SQL.

The existing Show Data/preview path continues to request read-only SQL; a confirmation-required response is handled as a failed preview rather than as a permission to write.

## Frontend flow

1. User presses **Run** in SQL Lab.
2. The existing query mutation submits SQL normally.
3. Read-only success updates results exactly as today.
4. A structured `sql_confirmation_required` response is preserved by `databaseApi` instead of being flattened into a generic string error.
5. SQL Lab opens an accessible modal. It shows the target connection, risk classification, server-supplied reason, expiry, and the exact SQL. **Cancel** is the default action.
6. **Run anyway** resubmits the same request with the supplied token. The UI does not edit SQL, limit, or auto-commit between receipt and resubmission.
7. The result/error path remains the existing one. If token validation fails, the modal closes and the user must submit and confirm the current SQL again.

The confirmation component receives typed props rather than performing SQL classification in the browser. It must return focus to Run when dismissed and expose explicit accessible names for Cancel and Run anyway.

## Error handling and observability

- Policy errors include a stable code suitable for UI branching and tests; the human message never leaks connection credentials.
- The backend logs the decision category, whether a completed execution consumed an approval, and the database ID, but never logs raw credentials or approval tokens.
- Query history records only executions that reach the executor; pending and blocked statements are not recorded as executed queries.
- A desktop sidecar restart fails closed because its in-memory approval store is empty.

## Compatibility

Browser development and Tauri desktop use the same API contract. Tauri's loopback sidecar owns approval state, so no cloud service or desktop IPC change is required. Existing read-only SQL Lab behavior and result shapes remain unchanged. Non-SQL execution behavior is unchanged in this slice and must not accidentally route through a SQL lexical classifier.

## Acceptance criteria

1. `/api/database/execute` cannot call a SQL driver for `UPDATE`, `DELETE`, `INSERT`, `DROP`, `ALTER`, transaction control, mutation CTEs, `SELECT INTO`, or `EXPLAIN ANALYZE` without an exact valid confirmation token.
2. A normal read-only query continues to execute and is subject to a server-owned maximum result limit.
3. A token is invalid after 120 seconds, use, API restart, or any change to user, database, normalized SQL, limit, or auto-commit.
4. The SQL Lab confirmation modal appears only for the structured backend response; Cancel sends no second execution request, and Confirm resubmits the unchanged request with its token.
5. AI agent execution remains read-only and receives no mechanism for submitting an approval token.
6. API, service, and web regression tests cover every acceptance criterion.

## Rollout order

1. Add backend policy and tests around `ExecutionService` before changing UI behavior.
2. Add approval store and endpoint contracts with API tests for mismatch, expiry, and replay.
3. Update API client, SQL Lab query mutation, and confirmation dialog with focused interaction tests.
4. Route/verify AI and preview entry points through the final boundary.
5. Run the focused backend and web tests, then the applicable broader API/web suites.

## Later product slices

The approved product goal still requires connection and credential isolation, schema/relationship continuity, and desktop sidecar hardening. They remain separate vertical slices after this one so that the safety boundary can be independently reviewed and shipped.