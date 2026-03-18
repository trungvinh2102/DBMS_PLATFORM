"""
backend/services/metadata.py

Service for retrieving database schema information.
"""

from services.base_service import BaseDatabaseService
from models.metadata import SessionLocal
from sqlalchemy import text, inspect
import logging

logger = logging.getLogger(__name__)

class MetadataService(BaseDatabaseService):
    """
    Retrieves metadata like schemas, tables, columns, and DDL.
    """

    def _get_mongo_client(self, database_id: str, session):
        """Helper to get a native MongoClient for a database ID (Legacy wrapper)."""
        return self.get_mongo_client(database_id, session)

    def get_schemas(self, database_id: str):
        """Lists schemas/databases in the database."""
        session = SessionLocal()
        try:
            db_type, config = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, _ = self.get_mongo_client(database_id, session)
                return client.list_database_names() if client else []
            if db_type == 'redis':
                # Redis typically has 16 databases (0-15) by default. 
                # INFO keyspace only returns databases with keys. 
                # We'll return 0-15 as "schemas" for exploration.
                return [str(i) for i in range(16)]
        except Exception as e:
            logger.error(f"Error in MongoDB get_schemas: {e}")
            return []
        finally:
            session.close()

        def _op(conn):
            # ClickHouse dialect's get_schema_names may use raw strings in SQLAlchemy 2.0
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                res = conn.execute(text("SHOW DATABASES"))
                return [row[0] for row in res]
            return inspect(conn).get_schema_names()
        return self.run_dynamic_query(database_id, _op)

    def get_tables(self, database_id: str, schema: str = 'public'):
        """
        Lists tables in a schema.
        """
        session = SessionLocal()
        try:
            db_type, config = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self.get_mongo_client(database_id, session)
                if client:
                    target_db = schema if schema and schema != 'public' else default_db
                    all_names = client[target_db].list_collection_names()
                    try:
                        collections_info = list(client[target_db].list_collections())
                        view_names = [c['name'] for c in collections_info if c.get('type') == 'view']
                        return [name for name in all_names if name not in view_names and not name.startswith('system.')]
                    except:
                        return [name for name in all_names if not name.startswith('system.')]
                return []
            if db_type == 'redis':
                # Use schema as database index if it's a number
                db_index = 0
                try:
                    db_index = int(schema) if schema and schema.isdigit() else int(config.get('database', 0))
                except:
                    pass
                
                client, _ = self.get_redis_client(database_id, session)
                if client:
                    try:
                        # Select the database
                        client.select(db_index)
                        
                        # Use SCAN to be safe
                        keys = []
                        for k in client.scan_iter(match='*', count=1000):
                            keys.append(k)
                            if len(keys) >= 1000: break
                        return sorted(keys)
                    except Exception as e:
                        logger.error(f"Error scanning Redis keys (DB {db_index}): {e}")
                        return []
            if db_type == 'mongodb' or db_type == 'redis':
                return []
        except Exception as e:
            logger.error(f"Error in MongoDB get_tables: {e}")
            return []
        finally:
            session.close()

        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                res = conn.execute(text(f"SHOW TABLES FROM `{target_schema}`"))
                return [row[0] for row in res]
            return inspect(conn).get_table_names(schema=schema)
        return self.run_dynamic_query(database_id, _op)

    def get_views(self, database_id: str, schema: str = 'public'):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self.get_mongo_client(database_id, session) # Fixed method name
                if client:
                    target_db = schema if schema and schema != 'public' else default_db
                    try:
                        collections = client[target_db].list_collections()
                        return [c['name'] for c in collections if c.get('type') == 'view']
                    except Exception as e:
                        logger.error(f"Error listing MongoDB views: {e}")
                        return []
                return []
            if db_type == 'redis':
                return []
        finally:
            session.close()

        def _op(conn):
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                # Views in ClickHouse are listed in SHOW TABLES but have different types in system.tables
                res = conn.execute(text(f"SELECT name FROM system.tables WHERE database = :schema AND engine LIKE '%View'"), {"schema": target_schema})
                return [row[0] for row in res]
            return inspect(conn).get_view_names(schema=schema)
        return self.run_dynamic_query(database_id, _op)

    def get_functions(self, database_id: str, schema: str = 'public'):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
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
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
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
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
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
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
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
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self.get_mongo_client(database_id, session)
                if not client: return []
                target_db = schema if schema and schema != 'public' else default_db
                collection = client[target_db][table]
                try:
                    cursor = collection.aggregate([{"$sample": {"size": 20}}])
                except Exception:
                    cursor = collection.find().limit(20)
                all_fields = {}
                for doc in cursor:
                    for key, value in doc.items():
                        if key not in all_fields or (all_fields[key] == 'NoneType' and value is not None):
                            all_fields[key] = type(value).__name__
                if not all_fields: return []
                return [{"name": key, "type": val_type, "nullable": True} for key, val_type in all_fields.items()]
            if db_type == 'redis':
                # Use schema as database index
                db_index = 0
                try:
                    db_index = int(schema) if schema and schema.isdigit() else 0
                except:
                    pass
                
                client, _ = self.get_redis_client(database_id, session)
                if not client: return []
                
                try:
                    client.select(db_index)
                    key_type = client.type(table)
                    cols = [{"name": "key", "type": "String", "nullable": False}, {"name": "type", "type": "String", "nullable": False}]
                    if key_type == 'string':
                        cols.append({"name": "value", "type": "String", "nullable": True})
                    elif key_type == 'hash':
                        fields = client.hkeys(table)
                        for f in fields[:50]:
                            cols.append({"name": f, "type": "HashField", "nullable": True})
                    return cols
                except:
                    return []
        except Exception as e:
            logger.error(f"Error in MongoDB get_columns: {e}")
            return []
        finally:
            session.close()

        def _op(conn):
            # ClickHouse columns if inspect fails
            if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                target_schema = 'default' if schema == 'public' else schema
                res = conn.execute(text(f"DESCRIBE TABLE `{target_schema}`.`{table}`"))
                return [{"name": row[0], "type": row[1], "nullable": True} for row in res]
            
            # Using inspector for others as it is more robust for columns across dialects
            return [{"name": c["name"], "type": str(c["type"]), "nullable": c.get("nullable", True)} 
                    for c in inspect(conn).get_columns(table, schema=schema)]
        return self.run_dynamic_query(database_id, _op)

    def get_all_columns(self, database_id: str, schema: str):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self.get_mongo_client(database_id, session) # Fixed method name
                if not client: return {}
                target_db = schema if schema and schema != 'public' else default_db
                collections = client[target_db].list_collection_names()
                result = {}
                for coll in collections:
                    doc = client[target_db][coll].find_one()
                    if doc:
                         result[coll] = [{"name": key, "type": type(value).__name__, "nullable": True} for key, value in doc.items()]
                    else:
                        result[coll] = []
                return result
            if db_type == 'redis':
                return {}
        except Exception as e:
            logger.error(f"Error in MongoDB get_all_columns: {e}")
            return {}
        finally:
            session.close()

        def _op(conn):
            inspector = inspect(conn)
            tables = inspector.get_table_names(schema=schema)
            result = {}
            for table in tables:
                try:
                    cols = inspector.get_columns(table, schema=schema)
                    result[table] = [{"name": c["name"], "type": str(c["type"]), "nullable": c.get("nullable", True)} for c in cols]
                except:
                    result[table] = []
            return result
        return self.run_dynamic_query(database_id, _op)

    def get_all_foreign_keys(self, database_id: str, schema: str):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
        finally:
            session.close()
            
        def _op(conn):
            inspector = inspect(conn)
            tables = inspector.get_table_names(schema=schema)
            all_fks = []
            for table in tables:
                try:
                    fks = inspector.get_foreign_keys(table, schema=schema)
                    for fk in fks:
                        for i, col in enumerate(fk['constrained_columns']):
                            all_fks.append({
                                "table": table,
                                "column": col,
                                "foreignSchema": fk.get('referred_schema') or schema,
                                "foreignTable": fk['referred_table'],
                                "foreignColumn": fk['referred_columns'][i] if i < len(fk['referred_columns']) else None
                            })
                except:
                    continue
            return all_fks
        return self.run_dynamic_query(database_id, _op)

    def get_indexes(self, database_id: str, schema: str, table: str):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self.get_mongo_client(database_id, session) # Fixed method name
                if not client: return []
                target_db = schema if schema and schema != 'public' else default_db
                collection = client[target_db][table]
                indexes = list(collection.list_indexes())
                return [{"indexname": idx.get('name'), "indexdef": str(idx.get('key'))} for idx in indexes]
            if db_type == 'redis':
                return []
        except Exception as e:
            logger.error(f"Error in MongoDB get_indexes: {e}")
            return []
        finally:
            session.close()

        def _op(conn):
            try:
                if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                    return []
                return [{"indexname": idx["name"], "indexdef": str(idx["column_names"])} 
                        for idx in inspect(conn).get_indexes(table, schema=schema)]
            except Exception:
                return []
        return self.run_dynamic_query(database_id, _op)

    def get_foreign_keys(self, database_id: str, schema: str, table: str):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
        finally:
            session.close()

        def _op(conn):
            try:
                if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                    return []
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
        return self.run_dynamic_query(database_id, _op)

    def get_table_info(self, database_id: str, schema: str, table: str):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                client, default_db = self.get_mongo_client(database_id, session)
                target_db = schema if schema and schema != 'public' else default_db
                stats = client[target_db].command("collstats", table)
                return {
                    "total_size": f"{stats.get('totalSize', 0) / 1024:.2f} KB",
                    "data_size": f"{stats.get('size', 0) / 1024:.2f} KB",
                    "index_size": f"{stats.get('totalIndexSize', 0) / 1024:.2f} KB",
                    "row_count": stats.get('count', 0)
                }
            if db_type == 'redis':
                client, _ = self.get_redis_client(database_id, session)
                if not client: return {}
                key_type = client.type(table)
                ttl = client.ttl(table)
                size = 0
                if key_type == 'string': size = client.strlen(table)
                elif key_type == 'hash': size = client.hlen(table)
                elif key_type == 'list': size = client.llen(table)
                elif key_type == 'set': size = client.scard(table)
                elif key_type == 'zset': size = client.zcard(table)
                
                return {
                    "type": key_type,
                    "ttl": f"{ttl}s" if ttl >= 0 else ("Infinity" if ttl == -1 else "n/a"),
                    "element_count": size,
                    "memory_usage": f"{client.memory_usage(table) or 0} bytes"
                }
        except Exception:
            return {}
        finally:
            session.close()

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
        return self.run_dynamic_query(database_id, _op)

    def get_table_ddl(self, database_id: str, schema: str, table: str):
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return f"-- MongoDB Collection: {schema}.{table}\n-- No DDL available for NoSQL"
            if db_type == 'redis':
                client, _ = self.get_redis_client(database_id, session)
                key_type = client.type(table) if client else "unknown"
                return f"-- Redis Key: {table} (DB {schema})\n-- Type: {key_type}\n-- No DDL available for NoSQL"
        finally:
            session.close()

        def _op(conn):
            try:
                if conn.dialect.name in ['clickhouse', 'clickhousedb']:
                    target_schema = 'default' if schema == 'public' else schema
                    res = conn.execute(text(f"SHOW CREATE TABLE `{target_schema}`.`{table}`")).fetchone()
                    return res[0] if res else ""

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
            except Exception as e:
                return f"-- Failed to generate DDL: {e}"
        return self.run_dynamic_query(database_id, _op)

metadata_service = MetadataService()
