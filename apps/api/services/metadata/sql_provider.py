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
            if conn.dialect.name == 'sqlite':
                return ['main']
            if conn.dialect.name == 'duckdb':
                # DuckDB typically uses 'main' as default
                try:
                    return inspect(conn).get_schema_names()
                except Exception:
                    return ['main']
            return inspect(conn).get_schema_names()
        return self.service.run_dynamic_query(db_id, _op)

    def get_tables(self, db_id: str, schema: str) -> List[str]:
        """Lists all table names within a specific schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                # Filter out views from table list for ClickHouse
                res = conn.execute(text(f"SELECT name FROM system.tables WHERE database = :schema AND engine NOT LIKE '%View'"), {"schema": target_schema})
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

    def get_all_columns(self, db_id: str, schema: str) -> Dict[str, List[Dict[str, Any]]]:
        """Retrieves columns for all tables and views in a schema using a single query."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                # Filter out columns belonging to views
                res = conn.execute(text(f"""
                    SELECT table, name, type 
                    FROM system.columns 
                    WHERE database = :schema 
                    AND table IN (SELECT name FROM system.tables WHERE database = :schema AND engine NOT LIKE '%View')
                """), {"schema": target_schema})
                result = {}
                for row in res:
                    table_name = row[0]
                    if table_name not in result:
                        result[table_name] = []
                    result[table_name].append({"name": row[1], "type": row[2], "nullable": True})
                return result
            
            # Specialized Postgres query for better accuracy - Exclude views ('v', 'm')
            if conn.dialect.name == 'postgresql':
                query = text("""
                    SELECT
                        rel.relname AS table_name,
                        att.attname AS column_name,
                        format_type(att.atttypid, att.atttypmod) AS data_type,
                        NOT att.attnotnull AS is_nullable
                    FROM
                        pg_attribute att
                    JOIN
                        pg_class rel ON rel.oid = att.attrelid
                    JOIN
                        pg_namespace nsp ON nsp.oid = rel.relnamespace
                    WHERE
                        nsp.nspname = :schema
                        AND att.attnum > 0
                        AND NOT att.attisdropped
                        AND rel.relkind IN ('r', 'p', 'f')
                    ORDER BY
                        rel.relname, att.attnum
                """)
                res = conn.execute(query, {"schema": schema})
            elif conn.dialect.name == 'mysql':
                # For MySQL, join with TABLES to ensure only BASE TABLEs are returned
                query = text("""
                    SELECT c.TABLE_NAME, c.COLUMN_NAME, c.COLUMN_TYPE, c.IS_NULLABLE
                    FROM INFORMATION_SCHEMA.COLUMNS c
                    JOIN INFORMATION_SCHEMA.TABLES t ON c.TABLE_SCHEMA = t.TABLE_SCHEMA AND c.TABLE_NAME = t.TABLE_NAME
                    WHERE c.TABLE_SCHEMA = :schema
                    AND t.TABLE_TYPE = 'BASE TABLE'
                    ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
                """)
                res = conn.execute(query, {"schema": schema})
            elif conn.dialect.name == 'sqlite':
                # SQLite doesn't have information_schema, use pragma
                tables = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'")).fetchall()
                result = {}
                for table_row in tables:
                    t_name = table_row[0]
                    col_res = conn.execute(text(f"PRAGMA table_info('{t_name}')")).fetchall()
                    result[t_name] = [{"name": c[1], "type": c[2], "nullable": not c[3]} for c in col_res]
                return result
            else:
                # Standard SQL fallback using information_schema
                query = text("""
                    SELECT c.table_name, c.column_name, c.data_type, c.is_nullable
                    FROM information_schema.columns c
                    JOIN information_schema.tables t ON c.table_schema = t.table_schema AND c.table_name = t.table_name
                    WHERE c.table_schema = :schema
                    AND t.table_type = 'BASE TABLE'
                    ORDER BY c.table_name, c.ordinal_position
                """)
                res = conn.execute(query, {"schema": schema})
            
            result = {}
            for row in res:
                table_name = row[0]
                if table_name not in result:
                    result[table_name] = []
                result[table_name].append({
                    "name": row[1],
                    "type": row[2],
                    "nullable": (row[3] == "YES") if isinstance(row[3], str) else row[3]
                })
            return result
        return self.service.run_dynamic_query(db_id, _op)

    def get_columns(self, db_id: str, schema: str, table: str) -> List[Dict[str, Any]]:
        """Reflects column names and types for a specific table."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                res = conn.execute(text(f"DESCRIBE TABLE `{target_schema}`.`{table}`"))
                return [{"name": row[0], "type": row[1], "nullable": True} for row in res]
            
            inspector = inspect(conn)
            cols = inspector.get_columns(table, schema=schema)
            try:
                pk_constraint = inspector.get_pk_constraint(table, schema=schema)
                pk_cols = pk_constraint.get("constrained_columns", [])
            except Exception:
                pk_cols = []
                
            return [
                {
                    "name": c["name"], 
                    "type": str(c["type"]), 
                    "nullable": c.get("nullable", True), 
                    "primary_key": bool(c.get("primary_key", False)) or (c["name"] in pk_cols), 
                    "autoincrement": bool(c.get("autoincrement", False))
                } 
                for c in cols
            ]
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

                if conn.dialect.name == 'sqlite':
                    # SQLite row count and size calculation
                    res_count = conn.execute(text(f"SELECT COUNT(*) FROM '{table}'")).fetchone()
                    try:
                        # Page size * Page count = Total size in bytes
                        res_size = conn.execute(text("PRAGMA page_count")).fetchone()[0] * conn.execute(text("PRAGMA page_size")).fetchone()[0]
                        total_size = f"{res_size / 1024 / 1024:.2f} MB"
                    except Exception:
                        total_size = "N/A"
                    return {"row_count": res_count[0] if res_count else 0, "total_size": total_size}

                if conn.dialect.name == 'duckdb':
                    # DuckDB row count
                    res_count = conn.execute(text(f"SELECT COUNT(*) FROM \"{table}\"")).fetchone()
                    return {"row_count": res_count[0] if res_count else 0, "total_size": "Dynamic"}

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
        """Constructs a CREATE TABLE statement, using native DDL when possible."""
        def _op(conn):
            try:
                if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                    target_schema = 'default' if schema == 'public' else schema
                    res = conn.execute(text(f"SHOW CREATE TABLE `{target_schema}`.`{table}`")).fetchone()
                    return res[0] if res else ""
                
                # SQLite: use native sqlite_master for exact DDL
                if conn.dialect.name == 'sqlite':
                    res = conn.execute(text(
                        "SELECT sql FROM sqlite_master WHERE type IN ('table', 'view') AND name = :name"
                    ), {"name": table}).fetchone()
                    return (res[0] + ";") if res and res[0] else f"-- No DDL found for {table}"
                
                # DuckDB: use native SHOW CREATE TABLE or duckdb_tables
                if conn.dialect.name == 'duckdb':
                    try:
                        res = conn.execute(text(f'SELECT sql FROM duckdb_tables() WHERE table_name = :name'), {"name": table}).fetchone()
                        if res and res[0]:
                            return res[0] + ";"
                    except Exception:
                        pass
                    # Fallback: try information_schema
                    try:
                        res = conn.execute(text(f'SHOW CREATE TABLE "{table}"')).fetchone()
                        if res:
                            return res[0] if isinstance(res[0], str) else str(res[0])
                    except Exception:
                        pass
                
                # Generic fallback: build DDL from column metadata
                cols_data = self.get_columns(db_id, schema, table)
                
                try:
                    pks = inspect(conn).get_pk_constraint(table, schema=schema).get("constrained_columns", [])
                except Exception:
                    pks = []
                
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
            if conn.dialect.name in ['clickhouse', 'clickhousedb', 'sqlite', 'duckdb']:
                return []
            query = text("SELECT routine_name FROM information_schema.routines WHERE routine_schema = :s AND routine_type = 'FUNCTION'")
            return [row[0] for row in conn.execute(query, {"s": schema})]
        return self.service.run_dynamic_query(db_id, _op)

    def get_procedures(self, db_id: str, schema: str) -> List[str]:
        """Lists all database procedures defined in the schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb', 'sqlite', 'duckdb']:
                return []
            query = text("SELECT routine_name FROM information_schema.routines WHERE routine_schema = :s AND routine_type = 'PROCEDURE'")
            return [row[0] for row in conn.execute(query, {"s": schema})]
        return self.service.run_dynamic_query(db_id, _op)

    def get_triggers(self, db_id: str, schema: str) -> List[str]:
        """Lists all triggers defined within the schema."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb', 'duckdb']:
                return []
            # SQLite stores triggers in sqlite_master
            if conn.dialect.name == 'sqlite':
                res = conn.execute(text("SELECT name FROM sqlite_master WHERE type='trigger'")).fetchall()
                return [row[0] for row in res]
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
        """Retrieves all foreign keys for all tables in a schema using a single query."""
        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb', 'sqlite', 'duckdb']:
                # Lite databases don't support optimized batch FK retrieval via information_schema
                # Force inspector fallback
                return self._inspector_fk_fallback(conn, schema)
            
            # Optimized query for Foreign Keys
            if conn.dialect.name == 'postgresql':
                # Exact columns for Postgres with column aggregation
                query = text("""
                    SELECT
                        rel.relname AS table_name,
                        con.conname AS constraint_name,
                        (
                            SELECT string_agg(attname, ', ')
                            FROM pg_attribute
                            WHERE attrelid = con.conrelid AND attnum = ANY(con.conkey)
                        ) AS columns,
                        fnsp.nspname AS foreign_schema,
                        frel.relname AS foreign_table,
                        (
                            SELECT string_agg(attname, ', ')
                            FROM pg_attribute
                            WHERE attrelid = con.confrelid AND attnum = ANY(con.confkey)
                        ) AS foreign_columns
                    FROM
                        pg_constraint con
                    JOIN
                        pg_class rel ON rel.oid = con.conrelid
                    JOIN
                        pg_namespace nsp ON nsp.oid = rel.relnamespace
                    JOIN
                        pg_class frel ON frel.oid = con.confrelid
                    JOIN
                        pg_namespace fnsp ON fnsp.oid = frel.relnamespace
                    WHERE
                        nsp.nspname = :schema
                        AND con.contype = 'f'
                """)
                res = conn.execute(query, {"schema": schema})
            elif conn.dialect.name == 'mysql':
                query = text("""
                    SELECT 
                        TABLE_NAME, 
                        CONSTRAINT_NAME, 
                        GROUP_CONCAT(COLUMN_NAME SEPARATOR ', ') AS columns,
                        REFERENCED_TABLE_SCHEMA, 
                        REFERENCED_TABLE_NAME, 
                        GROUP_CONCAT(REFERENCED_COLUMN_NAME SEPARATOR ', ') AS foreign_columns
                    FROM 
                        INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                    WHERE 
                        TABLE_SCHEMA = :schema 
                        AND REFERENCED_TABLE_NAME IS NOT NULL
                    GROUP BY 
                        TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_SCHEMA, REFERENCED_TABLE_NAME
                """)
                res = conn.execute(query, {"schema": schema})
            else:
                # Fallback to standard SQL schema query (might not handle multi-column FKs correctly in all DBs)
                try:
                    query = text("""
                        SELECT
                            kcu1.table_name,
                            kcu1.constraint_name,
                            kcu1.column_name,
                            kcu2.table_schema AS foreign_schema,
                            kcu2.table_name AS foreign_table,
                            kcu2.column_name AS foreign_column
                        FROM
                            information_schema.referential_constraints AS rc
                        JOIN
                            information_schema.key_column_usage AS kcu1
                              ON kcu1.constraint_name = rc.constraint_name
                              AND kcu1.constraint_schema = rc.constraint_schema
                        JOIN
                            information_schema.key_column_usage AS kcu2
                              ON kcu2.constraint_name = rc.unique_constraint_name
                              AND kcu2.constraint_schema = rc.unique_constraint_schema
                              AND kcu2.ordinal_position = kcu1.ordinal_position
                        WHERE
                            kcu1.table_schema = :schema
                    """)
                    res = conn.execute(query, {"schema": schema})
                except Exception:
                    return self._inspector_fk_fallback(conn, schema)
            
            try:
                all_fks = []
                for row in res:
                    all_fks.append({
                        "table": row[0],
                        "constraint": row[1],
                        "column": row[2],
                        "foreignSchema": row[3],
                        "foreignTable": row[4],
                        "foreignColumn": row[5],
                    })
                return all_fks
            except Exception as e:
                logger.warning(f"Optimized FK fetch failed, using inspector fallback: {e}")
                return self._inspector_fk_fallback(conn, schema)

        return self.service.run_dynamic_query(db_id, _op)

    def _inspector_fk_fallback(self, conn, schema: str) -> List[Dict[str, Any]]:
        """Fallback method to discover foreign keys using inspector.get_foreign_keys."""
        try:
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
        except Exception as e:
            logger.error(f"Failed to use inspector fallback for foreign keys: {e}")
            return []
