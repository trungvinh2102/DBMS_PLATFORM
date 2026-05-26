"""
schema_diff_service.py

Compares relational database schemas and generates reviewable migration scripts.
"""

from __future__ import annotations

import ast
import re
from typing import Any, Dict, Iterable, List, Optional

from models import SessionLocal
from schemas.schema_diff import SchemaDiffOperation, SchemaDiffResponse, SchemaDiffSummary
from services.base_service import BaseDatabaseService
from services.metadata import metadata_service


class SchemaDiffService(BaseDatabaseService):
    """Builds schema snapshots, compares them, and renders SQL migration text."""

    SQL_DIALECTS = {"postgres", "postgresql", "mysql", "mariadb", "sqlite", "duckdb", "mssql", "oracle"}

    def compare(
        self,
        source_database_id: str,
        target_database_id: str,
        source_schema: Optional[str] = None,
        target_schema: Optional[str] = None,
        include_destructive: bool = False,
    ) -> SchemaDiffResponse:
        source_type = self._get_database_type(source_database_id)
        target_type = self._get_database_type(target_database_id)
        self._ensure_sql_database(source_type, "source")
        self._ensure_sql_database(target_type, "target")

        source = self._snapshot(source_database_id, source_schema)
        target = self._snapshot(target_database_id, target_schema)
        operations = self._diff_snapshots(source, target, source_schema, target_schema, target_type)
        warnings = self._build_warnings(source_type, target_type, include_destructive)
        script = self._render_script(operations, target_type, include_destructive)

        return SchemaDiffResponse(
            sourceDatabaseId=source_database_id,
            targetDatabaseId=target_database_id,
            sourceSchema=source_schema,
            targetSchema=target_schema,
            targetDialect=target_type,
            operations=operations,
            summary=self._summarize(operations),
            migrationScript=script,
            warnings=warnings,
        )

    def _get_database_type(self, database_id: str) -> str:
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            return self._normalize_dialect(db_type)
        finally:
            session.close()

    def _ensure_sql_database(self, db_type: str, role: str) -> None:
        if db_type not in self.SQL_DIALECTS:
            raise ValueError(f"Schema diff only supports SQL databases. The {role} connection is {db_type}.")

    def _snapshot(self, database_id: str, schema: Optional[str]) -> Dict[str, Any]:
        tables = metadata_service.get_tables(database_id, schema)
        columns_by_table = metadata_service.get_all_columns(database_id, schema)
        table_map: Dict[str, Any] = {}

        for table in sorted(tables):
            table_columns = columns_by_table.get(table) or metadata_service.get_columns(database_id, schema, table)
            table_map[table] = {
                "name": table,
                "columns": {
                    column["name"]: self._normalize_column(column)
                    for column in table_columns
                    if column.get("name")
                },
                "indexes": {
                    self._index_signature(index): self._normalize_index(index)
                    for index in metadata_service.get_indexes(database_id, schema, table)
                },
                "foreignKeys": {
                    self._foreign_key_signature(fk): self._normalize_foreign_key(fk)
                    for fk in metadata_service.get_foreign_keys(database_id, schema, table)
                },
                "ddl": metadata_service.get_table_ddl(database_id, schema, table),
            }

        return {"tables": table_map}

    def _diff_snapshots(
        self,
        source: Dict[str, Any],
        target: Dict[str, Any],
        source_schema: Optional[str],
        target_schema: Optional[str],
        target_dialect: str,
    ) -> List[SchemaDiffOperation]:
        operations: List[SchemaDiffOperation] = []
        source_tables = source["tables"]
        target_tables = target["tables"]

        for table in sorted(source_tables.keys() - target_tables.keys()):
            operations.append(self._operation(
                "add", "table", table, None, "safe",
                f"Create table {table} in target schema",
                source_tables[table], None,
                self._create_table_sql(source_tables[table], source_schema, target_schema),
            ))

        for table in sorted(target_tables.keys() - source_tables.keys()):
            sql = [f"DROP TABLE {self._qualified_name(table, target_schema, target_dialect)};"]
            operations.append(self._operation(
                "drop", "table", table, None, "destructive",
                f"Drop table {table} from target schema",
                None, target_tables[table], sql,
            ))

        for table in sorted(source_tables.keys() & target_tables.keys()):
            operations.extend(self._diff_columns(table, source_tables[table], target_tables[table], target_schema, target_dialect))
            operations.extend(self._diff_indexes(table, source_tables[table], target_tables[table], target_schema, target_dialect))
            operations.extend(self._diff_foreign_keys(table, source_tables[table], target_tables[table], target_schema, target_dialect))

        return operations

    def _diff_columns(self, table: str, source: Dict[str, Any], target: Dict[str, Any], schema: Optional[str], dialect: str) -> List[SchemaDiffOperation]:
        operations: List[SchemaDiffOperation] = []
        source_columns = source["columns"]
        target_columns = target["columns"]

        for column in sorted(source_columns.keys() - target_columns.keys()):
            sql = [self._add_column_sql(table, source_columns[column], schema, dialect)]
            operations.append(self._operation("add", "column", column, table, "safe", f"Add column {table}.{column}", source_columns[column], None, sql))

        for column in sorted(target_columns.keys() - source_columns.keys()):
            sql = [f"ALTER TABLE {self._qualified_name(table, schema, dialect)} DROP COLUMN {self._quote(column, dialect)};"]
            operations.append(self._operation("drop", "column", column, table, "destructive", f"Drop column {table}.{column}", None, target_columns[column], sql))

        for column in sorted(source_columns.keys() & target_columns.keys()):
            source_col = source_columns[column]
            target_col = target_columns[column]
            if self._column_signature(source_col) == self._column_signature(target_col):
                continue
            sql = self._modify_column_sql(table, source_col, schema, dialect)
            operations.append(self._operation("modify", "column", column, table, "review", f"Modify column {table}.{column}", source_col, target_col, sql))

        return operations

    def _diff_indexes(self, table: str, source: Dict[str, Any], target: Dict[str, Any], schema: Optional[str], dialect: str) -> List[SchemaDiffOperation]:
        operations: List[SchemaDiffOperation] = []
        for signature in sorted(source["indexes"].keys() - target["indexes"].keys()):
            index = source["indexes"][signature]
            sql = self._create_index_sql(table, index, schema, dialect)
            operations.append(self._operation("add", "index", index["name"], table, "safe", f"Add index {index['name']} on {table}", index, None, sql))
        for signature in sorted(target["indexes"].keys() - source["indexes"].keys()):
            index = target["indexes"][signature]
            sql = [self._drop_index_sql(table, index["name"], schema, dialect)]
            operations.append(self._operation("drop", "index", index["name"], table, "review", f"Review target-only index {index['name']} on {table}", None, index, sql))
        return operations

    def _diff_foreign_keys(self, table: str, source: Dict[str, Any], target: Dict[str, Any], schema: Optional[str], dialect: str) -> List[SchemaDiffOperation]:
        operations: List[SchemaDiffOperation] = []
        for signature in sorted(source["foreignKeys"].keys() - target["foreignKeys"].keys()):
            fk = source["foreignKeys"][signature]
            sql = self._add_foreign_key_sql(table, fk, schema, dialect)
            operations.append(self._operation("add", "foreign_key", fk["name"], table, "safe", f"Add foreign key {fk['name']} on {table}", fk, None, sql))
        for signature in sorted(target["foreignKeys"].keys() - source["foreignKeys"].keys()):
            fk = target["foreignKeys"][signature]
            sql = [f"ALTER TABLE {self._qualified_name(table, schema, dialect)} DROP CONSTRAINT {self._quote(fk['name'], dialect)};"]
            operations.append(self._operation("drop", "foreign_key", fk["name"], table, "review", f"Review target-only foreign key {fk['name']} on {table}", None, fk, sql))
        return operations

    def _operation(self, action: str, object_type: str, object_name: str, table_name: Optional[str], severity: str, summary: str, source: Any, target: Any, sql: List[str]) -> SchemaDiffOperation:
        return SchemaDiffOperation(
            id=":".join([action, object_type, table_name or "-", object_name]),
            action=action,
            objectType=object_type,
            objectName=object_name,
            tableName=table_name,
            severity=severity,
            summary=summary,
            source=source,
            target=target,
            sql=sql,
        )

    def _normalize_column(self, column: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": str(column.get("name")),
            "type": self._normalize_type(column.get("type") or column.get("dataType") or ""),
            "nullable": bool(column.get("nullable", True)),
            "primaryKey": bool(column.get("primary_key") or column.get("primaryKey")),
            "autoincrement": bool(column.get("autoincrement", False)),
        }

    def _normalize_index(self, index: Dict[str, Any]) -> Dict[str, Any]:
        name = str(index.get("name") or index.get("indexname") or "unnamed_index")
        columns = self._extract_index_columns(index)
        return {
            "name": name,
            "columns": columns,
            "unique": bool(index.get("unique", False)),
            "definition": str(index.get("indexdef") or index.get("definition") or ""),
        }

    def _normalize_foreign_key(self, fk: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "name": str(fk.get("constraint") or fk.get("name") or "unnamed_fk"),
            "columns": self._split_columns(fk.get("column") or fk.get("columns")),
            "foreignSchema": fk.get("foreignSchema") or fk.get("referred_schema"),
            "foreignTable": fk.get("foreignTable") or fk.get("referred_table"),
            "foreignColumns": self._split_columns(fk.get("foreignColumn") or fk.get("referred_columns")),
        }

    def _column_signature(self, column: Dict[str, Any]) -> tuple:
        return (column["type"], column["nullable"], column["primaryKey"], column["autoincrement"])

    def _index_signature(self, index: Dict[str, Any]) -> str:
        normalized = self._normalize_index(index)
        columns = ",".join(normalized["columns"])
        return f"{normalized['unique']}:{columns or normalized['definition'].lower()}"

    def _foreign_key_signature(self, fk: Dict[str, Any]) -> str:
        normalized = self._normalize_foreign_key(fk)
        return "|".join([
            ",".join(normalized["columns"]),
            str(normalized["foreignSchema"] or ""),
            str(normalized["foreignTable"] or ""),
            ",".join(normalized["foreignColumns"]),
        ])

    def _normalize_type(self, value: Any) -> str:
        return re.sub(r"\s+", " ", str(value).strip().lower())

    def _split_columns(self, value: Any) -> List[str]:
        if isinstance(value, list):
            return [str(item) for item in value]
        if value is None:
            return []
        return [part.strip().strip('"`[]') for part in str(value).split(",") if part.strip()]

    def _extract_index_columns(self, index: Dict[str, Any]) -> List[str]:
        if isinstance(index.get("column_names"), list):
            return [str(item) for item in index["column_names"]]
        value = index.get("indexdef") or index.get("definition") or ""
        try:
            parsed = ast.literal_eval(str(value))
            if isinstance(parsed, list):
                return [str(item) for item in parsed]
        except (SyntaxError, ValueError):
            pass
        match = re.search(r"\(([^)]+)\)", str(value))
        return self._split_columns(match.group(1)) if match else []

    def _create_table_sql(self, table: Dict[str, Any], source_schema: Optional[str], target_schema: Optional[str]) -> List[str]:
        ddl = table.get("ddl") or ""
        if source_schema and target_schema and source_schema != target_schema:
            ddl = ddl.replace(f'"{source_schema}".', f'"{target_schema}".')
            ddl = ddl.replace(f"`{source_schema}`.", f"`{target_schema}`.")
        return [ddl if ddl.strip().endswith(";") else f"{ddl};"]

    def _add_column_sql(self, table: str, column: Dict[str, Any], schema: Optional[str], dialect: str) -> str:
        nullable = "" if column["nullable"] else " NOT NULL"
        return f"ALTER TABLE {self._qualified_name(table, schema, dialect)} ADD COLUMN {self._quote(column['name'], dialect)} {column['type']}{nullable};"

    def _modify_column_sql(self, table: str, column: Dict[str, Any], schema: Optional[str], dialect: str) -> List[str]:
        qualified = self._qualified_name(table, schema, dialect)
        name = self._quote(column["name"], dialect)
        nullable = "" if column["nullable"] else " NOT NULL"
        if dialect in {"postgres", "postgresql"}:
            null_sql = f"ALTER TABLE {qualified} ALTER COLUMN {name} {'DROP' if column['nullable'] else 'SET'} NOT NULL;"
            return [f"ALTER TABLE {qualified} ALTER COLUMN {name} TYPE {column['type']};", null_sql]
        if dialect in {"mysql", "mariadb"}:
            return [f"ALTER TABLE {qualified} MODIFY COLUMN {name} {column['type']}{nullable};"]
        return [f"-- Review manually: change {qualified}.{name} to {column['type']}{nullable}."]

    def _create_index_sql(self, table: str, index: Dict[str, Any], schema: Optional[str], dialect: str) -> List[str]:
        if not index["columns"]:
            return [f"-- Review manually: create index {index['name']} on {table}. Original definition: {index['definition']}"]
        unique = "UNIQUE " if index["unique"] else ""
        columns = ", ".join(self._quote(column, dialect) for column in index["columns"])
        return [f"CREATE {unique}INDEX {self._quote(index['name'], dialect)} ON {self._qualified_name(table, schema, dialect)} ({columns});"]

    def _drop_index_sql(self, table: str, index_name: str, schema: Optional[str], dialect: str) -> str:
        if dialect in {"mysql", "mariadb"}:
            return f"DROP INDEX {self._quote(index_name, dialect)} ON {self._qualified_name(table, schema, dialect)};"
        return f"DROP INDEX {self._qualified_name(index_name, schema, dialect)};"

    def _add_foreign_key_sql(self, table: str, fk: Dict[str, Any], schema: Optional[str], dialect: str) -> List[str]:
        if not fk["columns"] or not fk["foreignTable"] or not fk["foreignColumns"]:
            return [f"-- Review manually: incomplete foreign key metadata for {fk['name']} on {table}."]
        columns = ", ".join(self._quote(column, dialect) for column in fk["columns"])
        foreign_schema = fk["foreignSchema"] or schema
        foreign_columns = ", ".join(self._quote(column, dialect) for column in fk["foreignColumns"])
        return [
            f"ALTER TABLE {self._qualified_name(table, schema, dialect)} ADD CONSTRAINT {self._quote(fk['name'], dialect)} "
            f"FOREIGN KEY ({columns}) REFERENCES {self._qualified_name(fk['foreignTable'], foreign_schema, dialect)} ({foreign_columns});"
        ]

    def _qualified_name(self, name: str, schema: Optional[str], dialect: str) -> str:
        if schema:
            return f"{self._quote(schema, dialect)}.{self._quote(name, dialect)}"
        return self._quote(name, dialect)

    def _quote(self, identifier: str, dialect: str) -> str:
        escaped = str(identifier).replace("`", "``") if dialect in {"mysql", "mariadb"} else str(identifier).replace('"', '""')
        return f"`{escaped}`" if dialect in {"mysql", "mariadb"} else f'"{escaped}"'

    def _normalize_dialect(self, db_type: str) -> str:
        normalized = (db_type or "").lower()
        if normalized == "postgres":
            return "postgresql"
        if normalized == "sqlserver":
            return "mssql"
        return normalized

    def _render_script(self, operations: Iterable[SchemaDiffOperation], dialect: str, include_destructive: bool) -> str:
        lines = [
            "-- QurioDB schema migration preview",
            f"-- Target dialect: {dialect}",
            "-- Review before running. QurioDB does not execute this script automatically.",
            "",
        ]
        for operation in operations:
            lines.append(f"-- {operation.summary}")
            if operation.severity == "destructive" and not include_destructive:
                lines.extend(f"-- {statement}" for statement in operation.sql)
            else:
                lines.extend(operation.sql)
            lines.append("")
        return "\n".join(lines).strip() + "\n"

    def _summarize(self, operations: List[SchemaDiffOperation]) -> SchemaDiffSummary:
        actions = {key: sum(1 for op in operations if op.action == key) for key in ["add", "drop", "modify"]}
        severities = {key: sum(1 for op in operations if op.severity == key) for key in ["safe", "review", "destructive"]}
        return SchemaDiffSummary(
            added=actions["add"],
            removed=actions["drop"],
            modified=actions["modify"],
            safe=severities["safe"],
            review=severities["review"],
            destructive=severities["destructive"],
            total=len(operations),
        )

    def _build_warnings(self, source_type: str, target_type: str, include_destructive: bool) -> List[str]:
        warnings = []
        if source_type != target_type:
            warnings.append("Source and target use different dialects. Review generated type names and DDL carefully.")
        if not include_destructive:
            warnings.append("Destructive operations are commented out in the generated script.")
        if target_type in {"sqlite", "duckdb"}:
            warnings.append("Some ALTER COLUMN operations may require table rebuilds for file-based databases.")
        return warnings


schema_diff_service = SchemaDiffService()
