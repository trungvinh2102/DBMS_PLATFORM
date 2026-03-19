"""
redis_executor.py

Specialized executor for Redis commands.
"""

import shlex
import logging
from typing import List, Dict, Any, Tuple
from models.metadata import SessionLocal

logger = logging.getLogger(__name__)

class RedisExecutor:
    """Handles execution of Redis commands via string input, supporting most native Redis operations."""

    def __init__(self, service):
        self.service = service

    def execute(self, db_id: str, command_str: str, limit: int) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Parses and executes a Redis command, returning results in a table-compatible format."""
        session = SessionLocal()
        try:
            db_type, config = self.service.get_db_config(db_id, session)
            if db_type != 'redis':
                raise ValueError(f"Expected redis type, got {db_type}")
                
            client, _ = self.service.get_redis_client(db_id, session)
            if not client:
                raise Exception("Failed to connect to Redis cluster")
            
            # Use shlex for robust string splitting (handles quoted args)
            try:
                parts = shlex.split(command_str)
            except Exception:
                parts = command_str.split()
                
            if not parts:
                raise Exception("Empty Redis command")
            
            cmd, args = self._translate_command(parts, client)
            
            # Run the command and process result
            result = client.execute_command(cmd, *args)
            return self._process_result(result, limit)
        finally:
            session.close()

    # --- Private Helpers ---

    def _translate_command(self, parts: List[str], client) -> Tuple[str, List[str]]:
        """Translates basic SQL-like syntax (SELECT ...) into Redis equivalent commands."""
        cmd = parts[0].lower()
        args = parts[1:]
        
        # SQL-to-Redis: SELECT * FROM 'key' -> GET 'key'
        if cmd == 'select' and len(parts) >= 4 and parts[2].lower() == 'from':
            cmd = 'get'
            args = [parts[3].replace('"', '').replace("'", "")]
            
        # Detect key type and fallback to appropriate accessor
        if cmd == 'get' and len(args) == 1:
            key = args[0]
            try:
                k_type = client.type(key)
                if k_type == 'hash': return 'hgetall', [key]
                if k_type == 'list': return 'lrange', [key, '0', '99']
                if k_type == 'set': return 'smembers', [key]
                if k_type == 'zset': return 'zrange', [key, '0', '99', 'withscores']
            except Exception:
                pass
        
        return cmd, args

    def _process_result(self, result, limit: int) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Formats the Redis command result (list, dict, or scalar) for tabular display."""
        processed, columns = [], ["result"]
        
        if isinstance(result, (list, tuple, set)):
            columns = ["index", "value"]
            for i, val in enumerate(result):
                if i >= limit: break
                processed.append({"index": i, "value": str(val)})
        elif isinstance(result, dict):
            columns = sorted(result.keys()) if result else ["result"]
            processed.append({k: str(v) for k, v in result.items()})
        else:
            processed.append({"result": str(result)})
            
        return processed, sorted(list(columns))
