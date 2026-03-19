"""
mongo_provider.py

Metadata provider for MongoDB databases.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class MongoMetadataProvider:
    """Handles metadata extraction for MongoDB collections and databases."""

    def __init__(self, service):
        self.service = service

    def get_schemas(self, db_id: str, session) -> List[str]:
        """Lists all database names in the MongoDB cluster."""
        client, _ = self.service.get_mongo_client(db_id, session)
        return client.list_database_names() if client else []

    def get_tables(self, db_id: str, schema: str, session) -> List[str]:
        """Lists all non-system collections in a specific MongoDB database."""
        client, default_db = self.service.get_mongo_client(db_id, session)
        if not client:
            return []
            
        target_db = schema if schema and schema != 'public' else default_db
        all_names = client[target_db].list_collection_names()
        
        try:
            collections_info = list(client[target_db].list_collections())
            view_names = [c['name'] for c in collections_info if c.get('type') == 'view']
            return [name for name in all_names if name not in view_names and not name.startswith('system.')]
        except Exception:
            return [name for name in all_names if not name.startswith('system.')]

    def get_views(self, db_id: str, schema: str, session) -> List[str]:
        """Lists all views in a specific MongoDB database."""
        client, default_db = self.service.get_mongo_client(db_id, session)
        if not client:
            return []
            
        target_db = schema if schema and schema != 'public' else default_db
        try:
            collections = client[target_db].list_collections()
            return [c['name'] for c in collections if c.get('type') == 'view']
        except Exception as e:
            logger.error(f"Error listing MongoDB views: {e}")
            return []

    def get_columns(self, db_id: str, schema: str, table: str, session) -> List[Dict[str, Any]]:
        """Infers 'columns' (fields) by sampling documents from a collection."""
        client, default_db = self.service.get_mongo_client(db_id, session)
        if not client:
            return []
            
        target_db = schema if schema and schema != 'public' else default_db
        collection = client[target_db][table]
        
        try:
            # Sample documents to infer schema
            try:
                cursor = collection.aggregate([{"$sample": {"size": 20}}])
            except Exception:
                cursor = collection.find().limit(20)
                
            all_fields = {}
            for doc in cursor:
                for key, value in doc.items():
                    if key not in all_fields or (all_fields[key] == 'NoneType' and value is not None):
                        all_fields[key] = type(value).__name__
            
            return [{"name": k, "type": t, "nullable": True} for k, t in all_fields.items()]
        except Exception as e:
            logger.error(f"Error inferring MongoDB columns: {e}")
            return []

    def get_indexes(self, db_id: str, schema: str, table: str, session) -> List[Dict[str, Any]]:
        """Lists all indices defined on a MongoDB collection."""
        client, default_db = self.service.get_mongo_client(db_id, session)
        if not client:
            return []
            
        target_db = schema if schema and schema != 'public' else default_db
        try:
            collection = client[target_db][table]
            indexes = list(collection.list_indexes())
            return [{"indexname": idx.get('name'), "indexdef": str(idx.get('key'))} for idx in indexes]
        except Exception as e:
            logger.error(f"Error listing MongoDB indexes: {e}")
            return []

    def get_table_info(self, db_id: str, schema: str, table: str, session) -> Dict[str, Any]:
        """Returns statistics for a MongoDB collection."""
        client, default_db = self.service.get_mongo_client(db_id, session)
        if not client:
            return {}
            
        target_db = schema if schema and schema != 'public' else default_db
        try:
            stats = client[target_db].command("collstats", table)
            return {
                "total_size": f"{stats.get('totalSize', 0) / 1024:.2f} KB",
                "data_size": f"{stats.get('size', 0) / 1024:.2f} KB",
                "index_size": f"{stats.get('totalIndexSize', 0) / 1024:.2f} KB",
                "row_count": stats.get('count', 0)
            }
        except Exception:
            return {}
