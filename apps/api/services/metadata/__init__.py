"""
metadata/__init__.py

Service for retrieving database schema information, including tables, columns, and DDL.
Delegates specific database operations to dedicated providers.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy import text

from ..base_service import BaseDatabaseService
from models import SessionLocal
from .sql_provider import SqlMetadataProvider
from .mongo_provider import MongoMetadataProvider
from .redis_provider import RedisMetadataProvider
from .engine_objects import SqlEngineObjectProvider
from .admin_actions import SqlAdminActionProvider

logger = logging.getLogger(__name__)

class MetadataService(BaseDatabaseService):
    """
    Retrieves metadata like schemas, tables, columns, and DDL.
    Uses a provider-based architecture to support multiple database technologies.
    """

    def __init__(self):
        super().__init__()
        self.sql_provider = SqlMetadataProvider(self)
        self.engine_object_provider = SqlEngineObjectProvider(self)
        self.admin_action_provider = SqlAdminActionProvider(self)
        self.mongo_provider = MongoMetadataProvider(self)
        self.redis_provider = RedisMetadataProvider(self)

    def get_schemas(self, database_id: str) -> List[str]:
        """Lists all schemas or databases in the target database cluster."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return self.mongo_provider.get_schemas(database_id, session)
            if db_type == 'redis':
                return self.redis_provider.get_schemas()
            return self.sql_provider.get_schemas(database_id)
        except Exception as e:
            logger.error(f"Error fetching schemas for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_tables(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists all table or collection names within a specific schema or database."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return self.mongo_provider.get_tables(database_id, schema, session)
            if db_type == 'redis':
                return self.redis_provider.get_tables(database_id, schema, session)
            return self.sql_provider.get_tables(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching tables for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_views(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists all defined views within a given schema."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return self.mongo_provider.get_views(database_id, schema, session)
            if db_type == 'redis':
                return []
            return self.sql_provider.get_views(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching views for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_columns(self, database_id: str, schema: Optional[str], table: str) -> List[Dict[str, Any]]:
        """Retrieves or infers column details for a specific table or collection."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return self.mongo_provider.get_columns(database_id, schema, table, session)
            if db_type == 'redis':
                return self.redis_provider.get_columns(database_id, schema, table, session)
            return self.sql_provider.get_columns(database_id, schema, table)
        except Exception as e:
            logger.error(f"Error fetching columns for {table}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_all_columns(self, database_id: str, schema: Optional[str]) -> Dict[str, List[Dict[str, Any]]]:
        """Retrieves columns for all tables and views in a schema, optimized for performance."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                tables = self.mongo_provider.get_tables(database_id, schema, session)
                views = self.mongo_provider.get_views(database_id, schema, session)
                result = {}
                for obj in (tables + views):
                    result[obj] = self.mongo_provider.get_columns(database_id, schema, obj, session)
                return result
            if db_type == 'redis':
                return {}
            
            # Optimized for SQL databases
            return self.sql_provider.get_all_columns(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching all columns for {database_id}: {e}")
            # Fallback to individual fetches if optimized one fails
            logger.info("Falling back to separate column fetches...")
            tables = self.get_tables(database_id, schema)
            views = self.get_views(database_id, schema)
            result = {}
            for obj in (tables + views):
                result[obj] = self.get_columns(database_id, schema, obj)
            return result
        finally:
            if session:
                session.close()

    def get_indexes(self, database_id: str, schema: Optional[str], table: str) -> List[Dict[str, Any]]:
        """Lists all defined indices for the specified table or collection."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return self.mongo_provider.get_indexes(database_id, schema, table, session)
            if db_type == 'redis':
                return []
            return self.sql_provider.get_indexes(database_id, schema, table)
        except Exception as e:
            logger.error(f"Error fetching indexes for {table}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_foreign_keys(self, database_id: str, schema: Optional[str], table: str) -> List[Dict[str, Any]]:
        """Retrieves foreign key constraints defined for a given table."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
            return self.sql_provider.get_foreign_keys(database_id, schema, table)
        except Exception as e:
            logger.error(f"Error fetching foreign keys for {table}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_table_info(self, database_id: str, schema: Optional[str], table: str) -> Dict[str, Any]:
        """Retrieves size estimates and row count details for a given table."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return self.mongo_provider.get_table_info(database_id, schema, table, session)
            if db_type == 'redis':
                return self.redis_provider.get_table_info(database_id, schema, table, session)
            return self.sql_provider.get_table_info(database_id, schema, table)
        except Exception as e:
            logger.error(f"Error fetching table info for {table}: {e}")
            return {}
        finally:
            if session:
                session.close()

    def get_table_ddl(self, database_id: str, schema: Optional[str], table: str) -> str:
        """Retrieves or generates the CREATE TABLE DDL for the specified object."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type == 'mongodb':
                return f"-- MongoDB Collection: {schema}.{table}\n-- No DDL available for NoSQL"
            if db_type == 'redis':
                return f"-- Redis Key: {table} (DB {schema})\n-- No DDL available for NoSQL"
            return self.sql_provider.get_table_ddl(database_id, schema, table)
        except Exception as e:
            logger.error(f"Error generating DDL for {table}: {e}")
            return f"-- Failed to generate DDL: {e}"
        finally:
            if session:
                session.close()

    # --- SQL specific methods still using text queries directly for simplicity ---

    def get_functions(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists all database functions defined in the schema."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
            return self.sql_provider.get_functions(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching functions for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_procedures(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists all database procedures defined in the schema."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
            return self.sql_provider.get_procedures(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching procedures for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_triggers(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists all triggers defined within the schema."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
            return self.sql_provider.get_triggers(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching triggers for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_events(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists all scheduled database events (MySQL Specific)."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
            return self.sql_provider.get_events(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching events for {database_id}: {e}")
            return []
        finally:
            if session:
                session.close()

    def get_all_foreign_keys(self, database_id: str, schema: Optional[str] = None) -> List[Dict[str, Any]]:
        """Retrieves foreign key constraints for all tables in the schema."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ['mongodb', 'redis']:
                return []
            return self.sql_provider.get_all_foreign_keys(database_id, schema)
        except Exception as e:
            logger.error(f"Error fetching all foreign keys for {database_id}: {e}")
            return []
        finally:
            session.close()

    def get_materialized_views(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists engine-specific materialized or indexed views."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_materialized_views(database_id, schema),
        )

    def get_sequences(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists sequence objects for engines that support them."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_sequences(database_id, schema),
        )

    def get_partitions(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists partitions for engines that expose partition metadata."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_partitions(database_id, schema),
        )

    def get_roles(self, database_id: str) -> List[str]:
        """Lists roles or principals visible to the current connection."""
        return self._get_sql_engine_objects(database_id, lambda: self.engine_object_provider.get_roles(database_id))

    def get_grants(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists grants or permissions visible to the current connection."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_grants(database_id, schema),
        )

    def get_tablespaces(self, database_id: str) -> List[str]:
        """Lists tablespaces or equivalent storage groups."""
        return self._get_sql_engine_objects(database_id, lambda: self.engine_object_provider.get_tablespaces(database_id))

    def get_extensions(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists installed extensions or plugin-like database capabilities."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_extensions(database_id, schema),
        )

    def get_synonyms(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists synonym objects for engines that support them."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_synonyms(database_id, schema),
        )

    def get_jobs(self, database_id: str, schema: Optional[str] = None) -> List[str]:
        """Lists scheduled jobs where visible through metadata views."""
        return self._get_sql_engine_objects(
            database_id,
            lambda: self.engine_object_provider.get_jobs(database_id, schema),
        )

    def _get_sql_engine_objects(self, database_id: str, fetcher) -> List[str]:
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ["mongodb", "redis"]:
                return []
            return fetcher()
        except Exception as e:
            logger.error(f"Error fetching engine-specific objects for {database_id}: {e}")
            return []
        finally:
            session.close()

    def run_admin_action(
        self,
        database_id: str,
        object_type: str,
        object_name: str,
        action: str,
        schema_name: Optional[str] = None,
        options: Optional[Dict[str, Any]] = None,
        execute: bool = False,
        confirmation: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Builds or executes a guarded admin action for a supported SQL engine."""
        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
            if db_type in ["mongodb", "redis"]:
                raise ValueError(f"Admin actions are not supported for {db_type}.")
        finally:
            session.close()
        return self.admin_action_provider.run_action(
            database_id,
            object_type,
            object_name,
            action,
            schema_name,
            options or {},
            execute,
            confirmation,
        )

metadata_service = MetadataService()
