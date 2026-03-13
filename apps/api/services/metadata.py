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

    def _get_mongo_client(self, database_id: str, session):
        """Helper to get a native MongoClient for a database ID."""
        db_type, config = self.get_db_config(database_id, session)
        if db_type != 'mongodb':
            return None, None
            
        from pymongo import MongoClient
        host = config.get('host', '127.0.0.1')
        raw_port = config.get('port')
        try:
            port = int(raw_port) if raw_port else 27017
        except (ValueError, TypeError):
            port = 27017
            
        user = config.get('user')
        password = config.get('password')
        
        try:
            client = MongoClient(
                host=host,
                port=port,
                username=user,
                password=password,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            return client, config.get('database', 'test')
        except Exception as e:
            logger.error(f"Failed to create MongoClient: {e}")
            return None, None

    def get_schemas(self, database_id: str):
        """
        Lists schemas in the database.

        Args:
            database_id (str): The database ID.

        Returns:
            list[str]: A list of schema names.
        """
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, _ = self._get_mongo_client(database_id, session)
                if client:
                    # In MongoDB, "schemas" can be interpreted as databases
                    return client.list_database_names()
                return []
        except Exception as e:
            logger.error(f"Error in MongoDB get_schemas: {e}")
            return []
        finally:
            session.close()

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
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self._get_mongo_client(database_id, session)
                if client:
                    # In MongoDB, "tables" are collections. 
                    # If schema is 'public' (relational default) or empty, use the configured database
                    target_db = schema if schema and schema != 'public' else default_db
                    collections = client[target_db].list_collections()
                    return [c['name'] for c in collections if c.get('type', 'collection') == 'collection']
                return []
        except Exception as e:
            logger.error(f"Error in MongoDB get_tables: {e}")
            return []
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT table_name FROM information_schema.tables 
                WHERE table_schema = :schema AND table_type = 'BASE TABLE'
                ORDER BY table_name
            """)
            result = conn.execute(query, {"schema": schema})
            return [row[0] for row in result]
        return self.run_dynamic_query(database_id, _op)

    def get_views(self, database_id: str, schema: str = 'public'):
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self._get_mongo_client(database_id, session)
                if client:
                    target_db = schema if schema and schema != 'public' else default_db
                    collections = client[target_db].list_collections()
                    return [c['name'] for c in collections if c.get('type') == 'view']
                return []
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT table_name FROM information_schema.views 
                WHERE table_schema = :schema
                ORDER BY table_name
            """)
            try:
                result = conn.execute(query, {"schema": schema})
                return [row[0] for row in result]
            except Exception:
                return []
        return self.run_dynamic_query(database_id, _op)

    def get_functions(self, database_id: str, schema: str = 'public'):
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return []
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = :schema AND routine_type = 'FUNCTION'
                ORDER BY routine_name
            """)
            try:
                result = conn.execute(query, {"schema": schema})
                return list(set([row[0] for row in result]))
            except Exception:
                return []
        return self.run_dynamic_query(database_id, _op)

    def get_procedures(self, database_id: str, schema: str = 'public'):
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return []
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT routine_name FROM information_schema.routines 
                WHERE routine_schema = :schema AND routine_type = 'PROCEDURE'
                ORDER BY routine_name
            """)
            try:
                result = conn.execute(query, {"schema": schema})
                return list(set([row[0] for row in result]))
            except Exception:
                return []
        return self.run_dynamic_query(database_id, _op)

    def get_triggers(self, database_id: str, schema: str = 'public'):
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return []
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT trigger_name FROM information_schema.triggers 
                WHERE trigger_schema = :schema
                ORDER BY trigger_name
            """)
            try:
                result = conn.execute(query, {"schema": schema})
                return [row[0] for row in result]
            except Exception:
                return []
        return self.run_dynamic_query(database_id, _op)

    def get_events(self, database_id: str, schema: str = 'public'):
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return []
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT event_name FROM information_schema.events 
                WHERE event_schema = :schema
                ORDER BY event_name
            """)
            try:
                result = conn.execute(query, {"schema": schema})
                return [row[0] for row in result]
            except Exception:
                return []
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
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self._get_mongo_client(database_id, session)
                if not client: return []
                
                # In MongoDB, we can sample a document to get "columns"
                target_db = schema if schema and schema != 'public' else default_db
                collection = client[target_db][table]
                doc = collection.find_one()
                if not doc:
                    return []
                return [{
                    "name": key,
                    "type": type(value).__name__,
                    "nullable": True
                } for key, value in doc.items()]
        except Exception as e:
            logger.error(f"Error in MongoDB get_columns: {e}")
            return []
        finally:
            session.close()

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

    def get_all_columns(self, database_id: str, schema: str):
        """
        Lists all columns for all tables in a schema using Inspector for cross-db support.
        """
        from sqlalchemy import inspect
        def _op(conn):
            inspector = inspect(conn)
            tables = inspector.get_table_names(schema=schema)
            result = {}
            for table in tables:
                cols = inspector.get_columns(table, schema=schema)
                result[table] = [{
                    "name": c["name"],
                    "type": str(c["type"]),
                    "nullable": c.get("nullable", True)
                } for c in cols]
            return result
        return self.run_dynamic_query(database_id, _op)

    def get_all_foreign_keys(self, database_id: str, schema: str):
        """
        Lists all foreign keys in a schema using Inspector for cross-db support.
        """
        from sqlalchemy import inspect
        def _op(conn):
            inspector = inspect(conn)
            tables = inspector.get_table_names(schema=schema)
            all_fks = []
            for table in tables:
                fks = inspector.get_foreign_keys(table, schema=schema)
                for fk in fks:
                    # fk is usually like: {'name': ..., 'constrained_columns': [...], 'referred_schema': ..., 'referred_table': ..., 'referred_columns': [...]}
                    for i, col in enumerate(fk['constrained_columns']):
                        all_fks.append({
                            "table": table,
                            "column": col,
                            "foreignSchema": fk.get('referred_schema') or schema,
                            "foreignTable": fk['referred_table'],
                            "foreignColumn": fk['referred_columns'][i] if i < len(fk['referred_columns']) else None
                        })
            return all_fks
        return self.run_dynamic_query(database_id, _op)

    def get_indexes(self, database_id: str, schema: str, table: str):
         """
         Lists indexes for a table.
         """
         from models.metadata import SessionLocal
         session = SessionLocal()
         try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self._get_mongo_client(database_id, session)
                if client:
                    target_db = schema if schema and schema != 'public' else default_db
                    indexes = client[target_db][table].list_indexes()
                    return [{"indexname": idx["name"], "indexdef": str(idx["key"])} for idx in indexes]
                return []
         finally:
            session.close()

         def _op(conn):
            query = text("SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = :schema AND tablename = :table")
            rows = conn.execute(query, {"schema": schema, "table": table})
            return [{"indexname": r[0], "indexdef": r[1]} for r in rows]
         return self.run_dynamic_query(database_id, _op)

    def get_foreign_keys(self, database_id: str, schema: str, table: str):
        """
        Lists foreign keys for a table.
        """
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return []
        finally:
            session.close()

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
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self._get_mongo_client(database_id, session)
                target_db = schema if schema and schema != 'public' else default_db
                stats = client[target_db].command("collstats", table)
                return {
                    "total_size": f"{stats.get('totalSize', 0) / 1024:.2f} KB",
                    "data_size": f"{stats.get('size', 0) / 1024:.2f} KB",
                    "index_size": f"{stats.get('totalIndexSize', 0) / 1024:.2f} KB",
                    "row_count": stats.get('count', 0)
                }
        except Exception:
            return {}
        finally:
            session.close()

        def _op(conn):
            query = text("""
                SELECT
                  pg_size_pretty(pg_total_relation_size(quote_ident(:schema) || '.' || quote_ident(:table))) as total_size,
                  pg_size_pretty(pg_relation_size(quote_ident(:schema) || '.' || quote_ident(:table))) as data_size,
                  pg_size_pretty(pg_total_relation_size(quote_ident(:schema) || '.' || quote_ident(:table)) - pg_relation_size(quote_ident(:schema) || '.' || quote_ident(:table))) as index_size,
                  (SELECT n_live_tup FROM pg_stat_user_tables WHERE schemaname = :schema AND relname = :table) as row_count
            """)
            try:
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
        return self.run_dynamic_query(database_id, _op)

    def get_table_ddl(self, database_id: str, schema: str, table: str):
        """
        Generates DDL for a table (Prototype).
        """
        from models.metadata import SessionLocal
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return f"-- MongoDB Collection: {schema}.{table}\n-- No DDL available for NoSQL"
        finally:
            session.close()

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
