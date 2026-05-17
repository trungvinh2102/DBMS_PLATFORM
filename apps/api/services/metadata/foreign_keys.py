"""
foreign_keys.py

Dialect-aware foreign key discovery helpers for SQL metadata providers.
"""

import logging
from typing import Any, Dict, List

from sqlalchemy import inspect, text

logger = logging.getLogger(__name__)


def get_all_foreign_keys(conn, schema: str) -> List[Dict[str, Any]]:
    """Retrieves all foreign keys for a schema using dialect-specific queries."""
    if conn.dialect.name in ["clickhouse", "clickhousedb", "sqlite", "duckdb"]:
        return inspector_fk_fallback(conn, schema)
    if conn.dialect.name == "oracle":
        return _oracle_foreign_keys(conn, schema)
    if conn.dialect.name == "postgresql":
        result = conn.execute(_postgres_foreign_key_query(), {"schema": schema})
    elif conn.dialect.name == "mysql":
        result = conn.execute(_mysql_foreign_key_query(), {"schema": schema})
    else:
        result = _standard_foreign_key_result(conn, schema)

    return _rows_to_foreign_keys(result, conn, schema)


def inspector_fk_fallback(conn, schema: str) -> List[Dict[str, Any]]:
    """Discovers foreign keys using SQLAlchemy inspector metadata."""
    try:
        inspector = inspect(conn)
        foreign_keys = []
        for table in inspector.get_table_names(schema=schema):
            foreign_keys.extend(_table_foreign_keys(inspector, table, schema))
        return foreign_keys
    except Exception as exc:
        logger.error("Failed to use inspector fallback for foreign keys: %s", exc)
        return []


def _table_foreign_keys(inspector, table: str, schema: str) -> List[Dict[str, Any]]:
    try:
        return [
            {
                "table": table,
                "constraint": fk.get("name"),
                "column": ", ".join(fk["constrained_columns"]),
                "foreignSchema": fk.get("referred_schema"),
                "foreignTable": fk["referred_table"],
                "foreignColumn": ", ".join(fk["referred_columns"]),
            }
            for fk in inspector.get_foreign_keys(table, schema=schema)
        ]
    except Exception:
        return []


def _oracle_foreign_keys(conn, schema: str) -> List[Dict[str, Any]]:
    result = conn.execute(text("""
        SELECT
            a.TABLE_NAME,
            a.CONSTRAINT_NAME,
            a_col.COLUMN_NAME,
            c_pk.OWNER AS FOREIGN_SCHEMA,
            c_pk.TABLE_NAME AS FOREIGN_TABLE,
            b_col.COLUMN_NAME AS FOREIGN_COLUMN
        FROM
            ALL_CONSTRAINTS a
        JOIN ALL_CONS_COLUMNS a_col ON a.CONSTRAINT_NAME = a_col.CONSTRAINT_NAME AND a.OWNER = a_col.OWNER
        JOIN ALL_CONSTRAINTS c_pk ON a.R_CONSTRAINT_NAME = c_pk.CONSTRAINT_NAME AND a.R_OWNER = c_pk.OWNER
        JOIN ALL_CONS_COLUMNS b_col ON c_pk.CONSTRAINT_NAME = b_col.CONSTRAINT_NAME AND c_pk.OWNER = b_col.OWNER
            AND a_col.POSITION = b_col.POSITION
        WHERE
            a.CONSTRAINT_TYPE = 'R'
            AND a.OWNER = :schema
        ORDER BY a.TABLE_NAME, a.CONSTRAINT_NAME
    """), {"schema": schema.upper()})
    return _rows_to_foreign_keys(result, conn, schema)


def _postgres_foreign_key_query():
    return text("""
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


def _mysql_foreign_key_query():
    return text("""
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


def _standard_foreign_key_result(conn, schema: str):
    try:
        return conn.execute(text("""
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
        """), {"schema": schema})
    except Exception:
        return None


def _rows_to_foreign_keys(result, conn, schema: str) -> List[Dict[str, Any]]:
    if result is None:
        return inspector_fk_fallback(conn, schema)

    try:
        return [
            {
                "table": row[0],
                "constraint": row[1],
                "column": row[2],
                "foreignSchema": row[3],
                "foreignTable": row[4],
                "foreignColumn": row[5],
            }
            for row in result
        ]
    except Exception as exc:
        logger.warning("Optimized FK fetch failed, using inspector fallback: %s", exc)
        return inspector_fk_fallback(conn, schema)
