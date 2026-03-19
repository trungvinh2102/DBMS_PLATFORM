"""
sql_provider.py

Metadata provider for SQL-compliant databases using SQLAlchemy.
"""

import logging
from typing import List, Dict, Any, Optional
from sqlalchemy import text, inspect

logger = logging.getLogger(__name__)

class SqlMetadataProvider:
    """Handles metadata extraction for relational databases via SQLAlchemy reflection."""

    def __init__(self, service):
        self.service = service

    def get_schemas(self, db_id: str) -> List[str]:
        """Lists all schema or database names."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                res = conn.execute(text("SHOW DATABASES"))
                return [row[0] for row in res]
            return inspect(conn).get_schema_names()
        return self.service.run_dynamic_query(db_id, _op)

    def get_tables(self, db_id: str, schema: str) -> List[str]:
        """Lists all table names within a specific schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                res = conn.execute(text(f"SHOW TABLES FROM `{target_schema}`"))
                return [row[0] for row in res]
            return inspect(conn).get_table_names(schema=schema)
        return self.service.run_dynamic_query(db_id, _op)

    def get_views(self, db_id: str, schema: str) -> List[str]:
        """Lists all defined views within a schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                res = conn.execute(text(f"SELECT name FROM system.tables WHERE database = :schema AND engine LIKE '%View'"), {"schema": target_schema})
                return [row[0] for row in res]
            return inspect(conn).get_view_names(schema=schema)
        return self.service.run_dynamic_query(db_id, _op)

    def get_columns(self, db_id: str, schema: str, table: str) -> List[Dict[str, Any]]:
        """Reflects column names and types for a specific table."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                res = conn.execute(text(f"DESCRIBE TABLE `{target_schema}`.`{table}`"))
                return [{"name": row[0], "type": row[1], "nullable": True} for row in res]
            
            return [{"name": c["name"], "type": str(c["type"]), "nullable": c.get("nullable", True)} 
                    for c in inspect(conn).get_columns(table, schema=schema)]
        return self.service.run_dynamic_query(db_id, _op)

    def get_indexes(self, db_id: str, schema: str, table: str) -> List[Dict[str, Any]]:
        """Lists all indices defined on a database table."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                return []
            try:
                return [{"indexname": idx["name"], "indexdef": str(idx["column_names"])} 
                        for idx in inspect(conn).get_indexes(table, schema=schema)]
            except Exception:
                return []
        return self.service.run_dynamic_query(db_id, _op)

    def get_foreign_keys(self, db_id: str, schema: str, table: str) -> List[Dict[str, Any]]:
        """Retrieves foreign key constraints for relationship mapping."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                return []
            try:
                fks = inspect(conn).get_foreign_keys(table, schema=schema)
                return [{
                    "constraint": fk.get("name"),
                    "column": ", ".join(fk["constrained_columns"]),
                    "foreignSchema": fk.get("referred_schema"),
                    "foreignTable": fk["referred_table"],
                    "foreignColumn": ", ".join(fk["referred_columns"]),
                } for fk in fks]
            except Exception:
                return []
        return self.service.run_dynamic_query(db_id, _op)

    def get_table_info(self, db_id: str, schema: str, table: str) -> Dict[str, Any]:
        """Calculates table size and row count via dialect-specific queries."""
        def _op(conn):
            try:
                if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                    target_schema = 'default' if schema == 'public' else schema
                    query = text(f"SELECT sum(bytes_on_disk), count() FROM system.parts WHERE database = :schema AND table = :table AND active")
                    res = conn.execute(query, {"schema": target_schema, "table": table}).fetchone()
                    if res:
                        return {
                            "total_size": f"{res[0] / 1024 / 1024:.2f} MB" if res[0] else "0 MB",
                            "row_count": res[1] or 0
                        }

                # Postgres fallback (shared with others potentially)
                query = text("""
                    SELECT
                      pg_size_pretty(pg_total_relation_size(quote_ident(:schema) || '.' || quote_ident(:table))) as total_size,
                      pg_size_pretty(pg_relation_size(quote_ident(:schema) || '.' || quote_ident(:table))) as data_size,
                      pg_size_pretty(pg_total_relation_size(quote_ident(:schema) || '.' || quote_ident(:table)) - pg_relation_size(quote_ident(:schema) || '.' || quote_ident(:table))) as index_size,
                      (SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname = :schema AND relname = :table) as row_count
                """)
                result = conn.execute(query, {"schema": schema, "table": table}).fetchone()
                if result:
                    return {
                        "total_size": result[0] if result[0] else "0 bytes",
                        "data_size": result[1] if result[1] else "0 bytes",
                        "index_size": result[2] if result[2] else "0 bytes",
                        "row_count": result[3] if result[3] is not None else 0
                    }
            except Exception as e:
                logger.warning(f"Could not get table info for {schema}.{table}: {e}")
            return {}
        return self.service.run_dynamic_query(db_id, _op)

    def get_table_ddl(self, db_id: str, schema: str, table: str) -> str:
        """Constructs a basic CREATE TABLE statement based on column metadata."""
        def _op(conn):
            try:
                if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                    target_schema = 'default' if schema == 'public' else schema
                    res = conn.execute(text(f"SHOW CREATE TABLE `{target_schema}`.`{table}`")).fetchone()
                    return res[0] if res else ""
                
                # Fetch columns for building DDL
                cols_data = self.get_columns(db_id, schema, table)
                pk_query = text("""
                    SELECT kcu.column_name FROM information_schema.table_constraints tc
                    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = :schema AND tc.table_name = :table
                """)
                pks = [r[0] for r in conn.execute(pk_query, {"schema": schema, "table": table})]
                
                lines = [f'  "{c["name"]}" {c["type"].upper()}' for c in cols_data]
                pk_cols = ", ".join([f'"{k}"' for k in pks])
                if pks:
                    lines.append(f"  PRIMARY KEY ({pk_cols})")
                
                return f'CREATE TABLE "{schema}"."{table}" (\n' + ",\n".join(lines) + "\n);"
            except Exception as e:
                return f"-- Failed to generate DDL: {e}"
        return self.service.run_dynamic_query(db_id, _op)

    def get_functions(self, db_id: str, schema: str) -> List[str]:
        """Lists all database functions defined in the schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                return []
            query = text("SELECT routine_name FROM information_schema.routines WHERE routine_schema = :s AND routine_type = 'FUNCTION'")
            return [row[0] for row in conn.execute(query, {"s": schema})]
        return self.service.run_dynamic_query(db_id, _op)

    def get_procedures(self, db_id: str, schema: str) -> List[str]:
        """Lists all database procedures defined in the schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                return []
            query = text("SELECT routine_name FROM information_schema.routines WHERE routine_schema = :s AND routine_type = 'PROCEDURE'")
            return [row[0] for row in conn.execute(query, {"s": schema})]
        return self.service.run_dynamic_query(db_id, _op)

    def get_triggers(self, db_id: str, schema: str) -> List[str]:
        """Lists all triggers defined within the schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                return []
            query = text("SELECT trigger_name FROM information_schema.triggers WHERE trigger_schema = :s")
            return [row[0] for row in conn.execute(query, {"s": schema})]
        return self.service.run_dynamic_query(db_id, _op)

    def get_events(self, db_id: str, schema: str) -> List[str]:
        """Lists all scheduled database events (MySQL Specific, safe on others)."""
        def _op(conn):
            # Only MySQL has information_schema.events
            if conn.dialect.name != 'mysql':
                return []
            query = text("SELECT event_name FROM information_schema.events WHERE event_schema = :s")
            return [row[0] for row in conn.execute(query, {"s": schema})]
        return self.service.run_dynamic_query(db_id, _op)

    def get_all_foreign_keys(self, db_id: str, schema: str) -> List[Dict[str, Any]]:
        """Retrieves all foreign keys for all tables in a schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                return []
            
            inspector = inspect(conn)
            tables = inspector.get_table_names(schema=schema)
            all_fks = []
            for table in tables:
                try:
                    fks = inspector.get_foreign_keys(table, schema=schema)
                    for fk in fks:
                        all_fks.append({
                            "table": table,
                            "constraint": fk.get("name"),
                            "column": ", ".join(fk["constrained_columns"]),
                            "foreignSchema": fk.get("referred_schema"),
                            "foreignTable": fk["referred_table"],
                            "foreignColumn": ", ".join(fk["referred_columns"]),
                        })
                except Exception:
                    continue
            return all_fks
        return self.service.run_dynamic_query(db_id, _op)
