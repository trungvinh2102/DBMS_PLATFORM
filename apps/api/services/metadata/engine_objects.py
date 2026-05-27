"""
engine_objects.py

Dialect-specific metadata provider for database objects beyond tables and views.
"""

from typing import Any, Dict, List, Optional

from sqlalchemy import text


class SqlEngineObjectProvider:
    """Fetches engine-specific metadata objects with safe empty fallbacks."""

    def __init__(self, service):
        self.service = service

    def get_materialized_views(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists materialized or indexed views for engines that expose them."""

        def _op(conn):
            dialect = self._dialect(conn)
            target_schema = self._schema(schema, dialect)
            if dialect == "postgresql":
                return self._first_column(
                    conn,
                    """
                    SELECT matviewname
                    FROM pg_matviews
                    WHERE schemaname = :schema
                    ORDER BY matviewname
                    """,
                    {"schema": target_schema},
                )
            if dialect in ("clickhouse", "clickhousedb"):
                return self._first_column(
                    conn,
                    """
                    SELECT name
                    FROM system.tables
                    WHERE database = :schema AND engine LIKE '%MaterializedView'
                    ORDER BY name
                    """,
                    {"schema": target_schema},
                )
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    """
                    SELECT MVIEW_NAME
                    FROM ALL_MVIEWS
                    WHERE OWNER = :schema
                    ORDER BY MVIEW_NAME
                    """,
                    {"schema": target_schema.upper()},
                )
            if dialect == "mssql":
                return self._first_column(
                    conn,
                    """
                    SELECT v.name
                    FROM sys.views v
                    JOIN sys.schemas s ON s.schema_id = v.schema_id
                    WHERE s.name = :schema AND OBJECTPROPERTY(v.object_id, 'IsIndexed') = 1
                    ORDER BY v.name
                    """,
                    {"schema": target_schema},
                )
            return []

        return self._safe_query(db_id, _op)

    def get_sequences(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists sequence objects for engines with native sequence metadata."""

        def _op(conn):
            dialect = self._dialect(conn)
            target_schema = self._schema(schema, dialect)
            if dialect == "postgresql":
                return self._first_column(
                    conn,
                    """
                    SELECT sequence_name
                    FROM information_schema.sequences
                    WHERE sequence_schema = :schema
                    ORDER BY sequence_name
                    """,
                    {"schema": target_schema},
                )
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    """
                    SELECT SEQUENCE_NAME
                    FROM ALL_SEQUENCES
                    WHERE SEQUENCE_OWNER = :schema
                    ORDER BY SEQUENCE_NAME
                    """,
                    {"schema": target_schema.upper()},
                )
            if dialect == "mssql":
                return self._first_column(
                    conn,
                    """
                    SELECT seq.name
                    FROM sys.sequences seq
                    JOIN sys.schemas s ON s.schema_id = seq.schema_id
                    WHERE s.name = :schema
                    ORDER BY seq.name
                    """,
                    {"schema": target_schema},
                )
            if dialect == "mysql":
                return self._first_column(
                    conn,
                    """
                    SELECT TABLE_NAME
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_SCHEMA = :schema AND TABLE_TYPE = 'SEQUENCE'
                    ORDER BY TABLE_NAME
                    """,
                    {"schema": target_schema},
                )
            if dialect == "sqlite":
                return self._first_column(
                    conn,
                    """
                    SELECT name
                    FROM sqlite_master
                    WHERE type = 'table' AND name = 'sqlite_sequence'
                    """,
                    {},
                )
            if dialect == "duckdb":
                return self._first_column(
                    conn,
                    "SELECT sequence_name FROM duckdb_sequences() ORDER BY sequence_name",
                    {},
                )
            return []

        return self._safe_query(db_id, _op)

    def get_partitions(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists table partitions or partitioned storage units where available."""

        def _op(conn):
            dialect = self._dialect(conn)
            target_schema = self._schema(schema, dialect)
            if dialect == "postgresql":
                return self._first_column(
                    conn,
                    """
                    SELECT parent.relname || '.' || child.relname
                    FROM pg_inherits
                    JOIN pg_class child ON child.oid = inhrelid
                    JOIN pg_class parent ON parent.oid = inhparent
                    JOIN pg_namespace nsp ON nsp.oid = child.relnamespace
                    WHERE nsp.nspname = :schema
                    ORDER BY parent.relname, child.relname
                    """,
                    {"schema": target_schema},
                )
            if dialect == "mysql":
                return self._first_column(
                    conn,
                    """
                    SELECT CONCAT(TABLE_NAME, '.', PARTITION_NAME)
                    FROM INFORMATION_SCHEMA.PARTITIONS
                    WHERE TABLE_SCHEMA = :schema AND PARTITION_NAME IS NOT NULL
                    ORDER BY TABLE_NAME, PARTITION_ORDINAL_POSITION
                    """,
                    {"schema": target_schema},
                )
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    """
                    SELECT TABLE_NAME || '.' || PARTITION_NAME
                    FROM ALL_TAB_PARTITIONS
                    WHERE TABLE_OWNER = :schema
                    ORDER BY TABLE_NAME, PARTITION_POSITION
                    """,
                    {"schema": target_schema.upper()},
                )
            if dialect == "mssql":
                return self._first_column(
                    conn,
                    """
                    SELECT t.name + '.' + ps.name
                    FROM sys.tables t
                    JOIN sys.schemas s ON s.schema_id = t.schema_id
                    JOIN sys.indexes i ON i.object_id = t.object_id AND i.index_id IN (0, 1)
                    JOIN sys.partition_schemes ps ON ps.data_space_id = i.data_space_id
                    WHERE s.name = :schema
                    ORDER BY t.name, ps.name
                    """,
                    {"schema": target_schema},
                )
            if dialect in ("clickhouse", "clickhousedb"):
                return self._first_column(
                    conn,
                    """
                    SELECT DISTINCT table || '.' || partition
                    FROM system.parts
                    WHERE database = :schema AND active
                    ORDER BY table || '.' || partition
                    """,
                    {"schema": target_schema},
                )
            return []

        return self._safe_query(db_id, _op)

    def get_roles(self, db_id: str) -> List[str]:
        """Lists roles or database principals visible to the current connection."""

        def _op(conn):
            dialect = self._dialect(conn)
            if dialect == "postgresql":
                return self._first_column(conn, "SELECT rolname FROM pg_roles ORDER BY rolname", {})
            if dialect == "mysql":
                return self._first_column(
                    conn,
                    "SELECT CONCAT(User, '@', Host) FROM mysql.user ORDER BY User, Host",
                    {},
                )
            if dialect == "oracle":
                return self._first_column(conn, "SELECT ROLE FROM SESSION_ROLES ORDER BY ROLE", {})
            if dialect == "mssql":
                return self._first_column(
                    conn,
                    """
                    SELECT name
                    FROM sys.database_principals
                    WHERE type = 'R'
                    ORDER BY name
                    """,
                    {},
                )
            if dialect in ("clickhouse", "clickhousedb"):
                return self._first_column(conn, "SELECT name FROM system.roles ORDER BY name", {})
            return []

        return self._safe_query(db_id, _op)

    def get_grants(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists grants or permissions visible to the current connection."""

        def _op(conn):
            dialect = self._dialect(conn)
            target_schema = self._schema(schema, dialect)
            if dialect == "postgresql":
                return self._first_column(
                    conn,
                    """
                    SELECT grantee || ': ' || privilege_type || ' on ' || table_name
                    FROM information_schema.table_privileges
                    WHERE table_schema = :schema
                    ORDER BY grantee, table_name, privilege_type
                    """,
                    {"schema": target_schema},
                )
            if dialect == "mysql":
                return self._first_column(
                    conn,
                    """
                    SELECT CONCAT(GRANTEE, ': ', PRIVILEGE_TYPE, ' on ', TABLE_NAME)
                    FROM INFORMATION_SCHEMA.TABLE_PRIVILEGES
                    WHERE TABLE_SCHEMA = :schema
                    ORDER BY GRANTEE, TABLE_NAME, PRIVILEGE_TYPE
                    """,
                    {"schema": target_schema},
                )
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    """
                    SELECT GRANTEE || ': ' || PRIVILEGE || ' on ' || TABLE_NAME
                    FROM ALL_TAB_PRIVS
                    WHERE OWNER = :schema
                    ORDER BY GRANTEE, TABLE_NAME, PRIVILEGE
                    """,
                    {"schema": target_schema.upper()},
                )
            if dialect == "mssql":
                return self._first_column(
                    conn,
                    """
                    SELECT USER_NAME(dp.grantee_principal_id) + ': ' + dp.permission_name
                           + COALESCE(' on ' + OBJECT_NAME(dp.major_id), '')
                    FROM sys.database_permissions dp
                    ORDER BY USER_NAME(dp.grantee_principal_id), dp.permission_name
                    """,
                    {},
                )
            if dialect in ("clickhouse", "clickhousedb"):
                return [str(row[0]) for row in conn.execute(text("SHOW GRANTS")).fetchall()]
            return []

        return self._safe_query(db_id, _op)

    def get_tablespaces(self, db_id: str) -> List[str]:
        """Lists tablespaces, data spaces, or storage policies where supported."""

        def _op(conn):
            dialect = self._dialect(conn)
            if dialect == "postgresql":
                return self._first_column(conn, "SELECT spcname FROM pg_tablespace ORDER BY spcname", {})
            if dialect == "mysql":
                return self._first_column(
                    conn,
                    """
                    SELECT DISTINCT TABLESPACE_NAME
                    FROM INFORMATION_SCHEMA.FILES
                    WHERE TABLESPACE_NAME IS NOT NULL
                    ORDER BY TABLESPACE_NAME
                    """,
                    {},
                )
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    "SELECT TABLESPACE_NAME FROM USER_TABLESPACES ORDER BY TABLESPACE_NAME",
                    {},
                )
            if dialect == "mssql":
                return self._first_column(conn, "SELECT name FROM sys.data_spaces ORDER BY name", {})
            if dialect in ("clickhouse", "clickhousedb"):
                return self._first_column(conn, "SELECT policy_name FROM system.storage_policies ORDER BY policy_name", {})
            return []

        return self._safe_query(db_id, _op)

    def get_extensions(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists installed extensions or plugin-like database capabilities."""

        def _op(conn):
            dialect = self._dialect(conn)
            if dialect == "postgresql":
                return self._first_column(conn, "SELECT extname FROM pg_extension ORDER BY extname", {})
            if dialect == "mysql":
                return self._first_column(
                    conn,
                    "SELECT PLUGIN_NAME FROM INFORMATION_SCHEMA.PLUGINS WHERE PLUGIN_STATUS = 'ACTIVE' ORDER BY PLUGIN_NAME",
                    {},
                )
            if dialect == "duckdb":
                return self._first_column(
                    conn,
                    """
                    SELECT extension_name
                    FROM duckdb_extensions()
                    WHERE installed
                    ORDER BY extension_name
                    """,
                    {},
                )
            return []

        return self._safe_query(db_id, _op)

    def get_synonyms(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists synonym objects for Oracle and SQL Server."""

        def _op(conn):
            dialect = self._dialect(conn)
            target_schema = self._schema(schema, dialect)
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    """
                    SELECT SYNONYM_NAME
                    FROM ALL_SYNONYMS
                    WHERE OWNER IN (:schema, 'PUBLIC')
                    ORDER BY OWNER, SYNONYM_NAME
                    """,
                    {"schema": target_schema.upper()},
                )
            if dialect == "mssql":
                return self._first_column(
                    conn,
                    """
                    SELECT syn.name
                    FROM sys.synonyms syn
                    JOIN sys.schemas s ON s.schema_id = syn.schema_id
                    WHERE s.name = :schema
                    ORDER BY syn.name
                    """,
                    {"schema": target_schema},
                )
            return []

        return self._safe_query(db_id, _op)

    def get_jobs(self, db_id: str, schema: Optional[str]) -> List[str]:
        """Lists scheduled jobs where the engine exposes them through metadata views."""

        def _op(conn):
            dialect = self._dialect(conn)
            target_schema = self._schema(schema, dialect)
            if dialect == "oracle":
                return self._first_column(
                    conn,
                    """
                    SELECT JOB_NAME
                    FROM ALL_SCHEDULER_JOBS
                    WHERE OWNER = :schema
                    ORDER BY JOB_NAME
                    """,
                    {"schema": target_schema.upper()},
                )
            if dialect == "mssql":
                return self._first_column(conn, "SELECT name FROM msdb.dbo.sysjobs ORDER BY name", {})
            return []

        return self._safe_query(db_id, _op)

    def _safe_query(self, db_id: str, op) -> List[str]:
        try:
            return self.service.run_dynamic_query(db_id, op)
        except Exception:
            return []

    def _dialect(self, conn) -> str:
        return (getattr(conn.dialect, "name", "") or "").lower()

    def _schema(self, schema: Optional[str], dialect: str) -> str:
        if schema and schema != "public":
            return schema
        if dialect in ("clickhouse", "clickhousedb"):
            return "default" if schema in (None, "public") else schema
        if dialect == "sqlite":
            return "main"
        return schema or "public"

    def _first_column(self, conn, query: str, params: Dict[str, Any]) -> List[str]:
        rows = conn.execute(text(query), params).fetchall()
        return [str(row[0]) for row in rows if row and row[0] is not None]
