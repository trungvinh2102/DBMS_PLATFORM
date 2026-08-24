# Safe SQL execution analysis

## Scope

Define the first architectural slice for QurioDB: a desktop-first, local-first execution boundary that lets users run read queries without interruption while requiring a deliberate, server-enforced confirmation for write or destructive SQL.

## Internal evidence

- `apps/api/routes/execution_routes.py` accepts authenticated `/database/execute` requests and delegates directly to `ExecutionService.execute_query`.
- `apps/api/services/execution/sql_executor.py` rejects empty or multi-statement SQL and injects a user-provided `LIMIT` only for `SELECT`, but accepts DML and DDL. `autoCommit` controls the transaction behavior; it is not an authorization boundary.
- `apps/api/services/ai/sql_safety.py` already detects multiple statements, mutation CTEs, `SELECT INTO`, and common destructive operations. It is used by the AI agent and preview path, not the normal SQL Lab executor.
- `apps/api/services/ai/agent.py` validates generated agent SQL with `allow_write=False` before its direct execution path. The generic execution route remains an unguarded path for AI-generated SQL that users place in SQL Lab.
- `apps/web/src/app/sqllab/hooks/use-sqllab-query.ts` sends SQL directly through `databaseApi.execute`; its existing auto-commit control is not a confirmation UI.
- Existing regression tests cover AI validator bypasses in `apps/api/tests/test_sql_safety.py`, but no endpoint test proves that `/database/execute` rejects write SQL without an explicit approval.

## External sources

1. [Microsoft SQL Server security best practices](https://learn.microsoft.com/en-us/sql/relational-databases/security/sql-server-security-best-practices?view=sql-server-ver17), updated 2026-07-20: recommends defense in depth, least privilege, input validation, auditability, and minimizing executable surface area.
2. [Tauri v2 embedding external binaries](https://v2.tauri.app/develop/sidecar/): documents that a Tauri sidecar is an application-owned local process. QurioDB must therefore keep approval state and execution policy in the local backend rather than trusting browser-only state.
3. [Protect production SQL databases from AI/LLM agentic SQL query risks](https://rietta.com/blog/ai-sql-database-data-protection-read-replica/): illustrates that lexical/prompt controls alone do not replace deterministic execution guardrails for LLM database agents.

## Decision

Use a shared backend policy as the sole execution gate. Read-only SQL can execute immediately under server-owned bounds. SQL that can write, alter schema, control transactions, or cannot be deterministically classified as safe must first produce a one-time, short-lived approval bound to the exact normalized SQL, current user, database, and execution options. The executor must consume that approval before it opens a database connection.

The AI agent remains read-only and cannot receive or mint approvals. Any generated SQL that is later run through SQL Lab is protected by the same backend policy. UI confirmation is required for usability but is not the security boundary.

## Non-goals for this slice

- Replacing database permissions, database roles, or transaction semantics.
- Introducing cloud execution, shared approval workflows, or telemetry services.
- Solving saved-query ownership, credential-key management, query cancellation, schema navigation, or desktop sidecar lifecycle. Those remain required later vertical slices of the product goal.

## Regression coverage

The implementation must prove that the generic endpoint never invokes a driver for unapproved dangerous SQL; approvals cannot be replayed, altered, expired, or applied to another user/database; read-only queries preserve current workflow; and AI-owned execution stays read-only.