"""
backend/services/metadata.py

Service for retrieving database schema information.
"""

from services.base_service import BaseDatabaseService
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

class MetadataService(BaseDatabaseService):
    """
    Retrieves metadata like schemas, tables, columns, and DDL.
    """

    def get_schemas(self, database_id: str):
        """
        Lists schemas in the database.

        Args:
            database_id (str): The database ID.

        Returns:
            list[str]: A list of schema names.
        """
        def _op(conn):
            query = text("""
                SELECT schema_name FROM information_schema.schemata 
                WHERE schema_name NOT IN ('pg_catalog', 'pg_toast')
                AND schema_name NOT LIKE 'pg_temp_%'
                AND schema_name NOT LIKE 'pg_toast_temp_%'
                ORDER BY schema_name
            """)
            result = conn.execute(query)
            return [row[0] for row in result]
        return self.run_dynamic_query(database_id, _op)

    def get_tables(self, database_id: str, schema: str = 'public'):
        """
        Lists tables in a schema.

        Args:
            database_id (str): The database ID.
            schema (str): The schema name.

        Returns:
            list[str]: A list of table names.
        """
        def _op(conn):
            query = text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = :schema AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            result = conn.execute(query, {"schema": schema})
            return [row[0] for row in result]
        return self.run_dynamic_query(database_id, _op)

    def get_columns(self, database_id: str, schema: str, table: str):
        """
        Lists columns for a table.

        Args:
            database_id (str): The database ID.
            schema (str): The schema name.
            table (str): The table name.

        Returns:
            list[dict]: A list of column metadata.
        """
        def _op(conn):
            query = text("""
                SELECT column_name, data_type, is_nullable 
                FROM information_schema.columns 
                WHERE table_schema = :schema AND table_name = :table
                ORDER BY ordinal_position
            """)
            rows = conn.execute(query, {"schema": schema, "table": table})
            return [{
                "name": r[0],
                "type": r[1],
                "nullable": r[2] == "YES"
            } for r in rows]
        return self.run_dynamic_query(database_id, _op)

    def get_indexes(self, database_id: str, schema: str, table: str):
         """
         Lists indexes for a table.
         """
         def _op(conn):
            query = text("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = :schema AND tablename = :table")
            rows = conn.execute(query, {"schema": schema, "table": table})
            return [{"indexname": r[0], "indexdef": r[1]} for r in rows]
         return self.run_dynamic_query(database_id, _op)

    def get_foreign_keys(self, database_id: str, schema: str, table: str):
        """
        Lists foreign keys for a table.
        """
        def _op(conn):
            query = text("""
                SELECT
                    tc.constraint_name,
                    kcu.column_name,
                    ccu.table_schema AS foreign_table_schema,
                    ccu.table_name AS foreign_table_name,
                    ccu.column_name AS foreign_column_name
                FROM
                    information_schema.table_constraints AS tc
                    JOIN information_schema.key_column_usage AS kcu
                      ON tc.constraint_name = kcu.constraint_name
                      AND tc.table_schema = kcu.table_schema
                    JOIN information_schema.constraint_column_usage AS ccu
                      ON ccu.constraint_name = tc.constraint_name
                      AND ccu.table_schema = tc.table_schema
                WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = :schema AND tc.table_name = :table
            """)
            rows = conn.execute(query, {"schema": schema, "table": table})
            return [{
                "constraint": r[0],
                "column": r[1],
                "foreignSchema": r[2],
                "foreignTable": r[3],
                "foreignColumn": r[4],
            } for r in rows]
        return self.run_dynamic_query(database_id, _op)
    
    def get_table_info(self, database_id: str, schema: str, table: str):
        """
        Gets detailed table statistics.
        """
        def _op(conn):
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
                     "total_size": result[0],
                     "data_size": result[1],
                     "index_size": result[2],
                     "row_count": result[3]
                 }
            return {}
        return self.run_dynamic_query(database_id, _op)

    def get_table_ddl(self, database_id: str, schema: str, table: str):
        """
        Generates DDL for a table (Prototype).
        """
        def _op(conn):
            cols_query = text("""
                SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
                FROM information_schema.columns
                WHERE table_schema = :schema AND table_name = :table
                ORDER BY ordinal_position
            """)
            cols = conn.execute(cols_query, {"schema": schema, "table": table})
            
            pk_query = text("""
                SELECT kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu
                ON tc.constraint_name = kcu.constraint_name
                AND tc.table_schema = kcu.table_schema
                WHERE tc.constraint_type = 'PRIMARY KEY'
                AND tc.table_schema = :schema
                AND tc.table_name = :table
            """)
            pks = [r[0] for r in conn.execute(pk_query, {"schema": schema, "table": table})]
            
            lines = []
            for col in cols:
                line = f'  "{col[0]}" {col[1].upper()}'
                if col[2]: line += f'({col[2]})'
                if col[3] == "NO": line += " NOT NULL"
                if col[4]: line += f" DEFAULT {col[4]}"
                lines.append(line)
                
            if pks:
                pk_str = ", ".join([f'"{k}"' for k in pks])
                lines.append(f"  PRIMARY KEY ({pk_str})")
            
            sql = f'CREATE TABLE "{schema}"."{table}" (\n' + ",\n".join(lines) + "\n);"
            return sql
            
        return self.run_dynamic_query(database_id, _op)

metadata_service = MetadataService()
