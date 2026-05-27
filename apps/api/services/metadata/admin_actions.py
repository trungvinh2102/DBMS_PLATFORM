"""
admin_actions.py

Guarded SQL administration actions for engine-specific metadata objects.
"""

from typing import Any, Dict, Optional

from sqlalchemy import text


class SqlAdminActionProvider:
    """Builds and optionally executes allowlisted administration SQL."""

    CONFIRMATION_TOKEN = "EXECUTE"

    def __init__(self, service):
        self.service = service

    def run_action(
        self,
        database_id: str,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str],
        options: Dict[str, Any],
        execute: bool,
        confirmation: Optional[str],
    ) -> Dict[str, Any]:
        """Returns SQL preview or executes the generated administration action."""

        def _op(conn):
            dialect = self._dialect(conn)
            sql, risk_level = self._build_sql(
                dialect,
                object_type,
                object_name,
                action,
                schema_name,
                options or {},
            )
            response = {
                "action": action,
                "objectType": object_type,
                "objectName": object_name,
                "dialect": dialect,
                "sql": sql,
                "riskLevel": risk_level,
                "requiresConfirmation": True,
                "executed": False,
                "columns": [],
                "data": [],
                "message": "Review the generated SQL before executing.",
            }
            if not execute:
                return response
            if confirmation != self.CONFIRMATION_TOKEN:
                raise ValueError("Admin action requires confirmation token EXECUTE.")

            exec_conn = conn
            if dialect not in ["clickhouse", "clickhousedb", "duckdb"]:
                exec_conn = conn.execution_options(isolation_level="AUTOCOMMIT")
            result = exec_conn.execute(text(sql))
            response["executed"] = True
            response["message"] = "Admin action executed successfully."
            if result.returns_rows:
                response["columns"] = list(result.keys())
                response["data"] = [dict(row._mapping) for row in result]
            return response

        return self.service.run_dynamic_query(database_id, _op)

    def _build_sql(
        self,
        dialect: str,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str],
        options: Dict[str, Any],
    ) -> tuple[str, str]:
        normalized_type = object_type.lower()
        normalized_action = action.lower()

        if dialect == "postgresql":
            return self._build_postgres_sql(
                normalized_type,
                object_name,
                normalized_action,
                schema_name,
                options,
            )
        if dialect == "mssql":
            return self._build_mssql_sql(normalized_type, object_name, normalized_action, schema_name, options)
        if dialect == "mysql":
            return self._build_mysql_sql(normalized_type, object_name, normalized_action, schema_name)
        if dialect == "oracle":
            return self._build_oracle_sql(normalized_type, object_name, normalized_action, schema_name)
        raise ValueError(f"Admin action is not supported for dialect '{dialect}'.")

    def _build_postgres_sql(
        self,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str],
        options: Dict[str, Any],
    ) -> tuple[str, str]:
        if object_type == "materialized_view" and action in ["refresh", "refresh_concurrently"]:
            concurrently = " CONCURRENTLY" if action == "refresh_concurrently" else ""
            return f"REFRESH MATERIALIZED VIEW{concurrently} {self._qualified_name(schema_name, object_name)};", "medium"
        if object_type == "sequence" and action == "restart_with":
            restart_with = self._positive_int(options.get("restartWith"), "restartWith")
            return f"ALTER SEQUENCE {self._qualified_name(schema_name, object_name)} RESTART WITH {restart_with};", "high"
        if object_type == "extension" and action == "drop":
            return f"DROP EXTENSION {self._quote_identifier(object_name)};", "high"
        raise ValueError("Unsupported PostgreSQL admin action for this object.")

    def _build_mssql_sql(
        self,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str],
        options: Dict[str, Any],
    ) -> tuple[str, str]:
        if object_type == "sequence" and action == "restart_with":
            restart_with = self._positive_int(options.get("restartWith"), "restartWith")
            return f"ALTER SEQUENCE {self._qualified_name(schema_name, object_name)} RESTART WITH {restart_with};", "high"
        if object_type == "job" and action in ["enable", "disable"]:
            enabled = 1 if action == "enable" else 0
            return f"EXEC msdb.dbo.sp_update_job @job_name = N'{self._escape_literal(object_name)}', @enabled = {enabled};", "high"
        raise ValueError("Unsupported SQL Server admin action for this object.")

    def _build_mysql_sql(
        self,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str],
    ) -> tuple[str, str]:
        if object_type == "event" and action in ["enable", "disable"]:
            status = "ENABLE" if action == "enable" else "DISABLE"
            return f"ALTER EVENT {self._qualified_name(schema_name, object_name, quote='`')} {status};", "high"
        raise ValueError("Unsupported MySQL admin action for this object.")

    def _build_oracle_sql(
        self,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str],
    ) -> tuple[str, str]:
        qualified = self._oracle_scheduler_name(schema_name, object_name)
        if object_type == "materialized_view" and action == "refresh":
            return f"BEGIN DBMS_MVIEW.REFRESH('{qualified}'); END;", "medium"
        if object_type == "job" and action in ["enable", "disable"]:
            procedure = "ENABLE" if action == "enable" else "DISABLE"
            return f"BEGIN DBMS_SCHEDULER.{procedure}('{qualified}'); END;", "high"
        raise ValueError("Unsupported Oracle admin action for this object.")

    def _qualified_name(self, schema_name: Optional[str], object_name: str, quote: str = '"') -> str:
        parts = object_name.split(".")
        if schema_name and len(parts) == 1:
            parts = []
            parts.extend(schema_name.split("."))
            parts.extend(object_name.split("."))
        return ".".join(self._quote_identifier(part, quote) for part in parts if part)

    def _oracle_scheduler_name(self, schema_name: Optional[str], object_name: str) -> str:
        parts = object_name.split(".")
        if schema_name and len(parts) == 1:
            parts = []
            parts.extend(schema_name.split("."))
            parts.extend(object_name.split("."))
        return ".".join(part.upper().replace("'", "''") for part in parts if part)

    def _positive_int(self, value: Any, field_name: str) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"{field_name} must be a positive integer.") from exc
        if parsed < 1:
            raise ValueError(f"{field_name} must be a positive integer.")
        return parsed

    def _quote_identifier(self, identifier: str, quote: str = '"') -> str:
        clean = str(identifier).strip()
        if not clean:
            raise ValueError("Object identifier cannot be empty.")
        escaped = clean.replace(quote, quote + quote)
        return f"{quote}{escaped}{quote}"

    def _escape_literal(self, value: str) -> str:
        return str(value).replace("'", "''")

    def _dialect(self, conn) -> str:
        return (getattr(conn.dialect, "name", "") or getattr(conn.engine.dialect, "name", "") or "").lower()
