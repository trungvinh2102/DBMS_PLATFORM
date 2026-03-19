"""
redis_provider.py

Metadata provider for Redis databases.
"""

import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class RedisMetadataProvider:
    """Handles metadata extraction for Redis databases and keys."""

    def __init__(self, service):
        self.service = service

    def get_schemas(self) -> List[str]:
        """Provides indices (0-15) for exploration, as per standard configuration."""
        return [str(i) for i in range(16)]

    def get_tables(self, db_id: str, schema: str, session) -> List[str]:
        """Lists all keys in a specific Redis database via non-blocking scanning."""
        db_type, config = self.service.get_db_config(db_id, session)
        db_index = self._get_db_index(schema, config)
        
        client, _ = self.service.get_redis_client(db_id, session)
        if not client:
            return []
            
        try:
            client.select(db_index)
            keys = []
            # SCAN is safer in production than KEYS *
            for k in client.scan_iter(match='*', count=1000):
                keys.append(k)
                if len(keys) >= 1000: break
            return sorted(keys)
        except Exception as e:
            logger.error(f"Error scanning Redis keys (DB {db_index}): {e}")
            return []

    def get_columns(self, db_id: str, schema: str, table: str, session) -> List[Dict[str, Any]]:
        """Infers 'columns' (metadata fields) based on key type."""
        db_type, config = self.service.get_db_config(db_id, session)
        db_index = self._get_db_index(schema, config)
        
        client, _ = self.service.get_redis_client(db_id, session)
        if not client:
            return []
            
        try:
            client.select(db_index)
            key_type = client.type(table)
            cols = [
                {"name": "key", "type": "String", "nullable": False}, 
                {"name": "type", "type": "String", "nullable": False}
            ]
            if key_type == 'string':
                cols.append({"name": "value", "type": "String", "nullable": True})
            elif key_type == 'hash':
                # Sampling hash fields for visibility
                fields = client.hkeys(table)
                for f in fields[:50]:
                    cols.append({"name": f, "type": "HashField", "nullable": True})
            return cols
        except Exception:
            return []

    def get_table_info(self, db_id: str, schema: str, table: str, session) -> Dict[str, Any]:
        """Provides statistics such as key type, expiration (TTL), and memory usage."""
        db_type, config = self.service.get_db_config(db_id, session)
        db_index = self._get_db_index(schema, config)
        
        client, _ = self.service.get_redis_client(db_id, session)
        if not client:
             return {}
        
        try:
            client.select(db_index)
            key_type = client.type(table)
            ttl = client.ttl(table)
            size = self._get_key_size(client, table, key_type)
            
            return {
                "type": key_type,
                "ttl": f"{ttl}s" if ttl >= 0 else ("Infinity" if ttl == -1 else "n/a"),
                "element_count": size,
                "memory_usage": f"{client.memory_usage(table) or 0} bytes"
            }
        except Exception:
            return {}

    # --- Private Helpers ---

    def _get_db_index(self, schema: str, config: Dict[str, Any]) -> int:
        """Determines the correct database index from schema name or service config."""
        try:
            return int(schema) if schema and schema.isdigit() else int(config.get('database', 0))
        except (ValueError, TypeError):
            return 0

    def _get_key_size(self, client, table: str, key_type: str) -> int:
        """Determines the number of elements or characters in a given key."""
        if key_type == 'string': return client.strlen(table)
        if key_type == 'hash': return client.hlen(table)
        if key_type == 'list': return client.llen(table)
        if key_type == 'set': return client.scard(table)
        if key_type == 'zset': return client.zcard(table)
        return 0
