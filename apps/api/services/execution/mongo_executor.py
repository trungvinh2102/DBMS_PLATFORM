"""
mongo_executor.py

Specialized executor for MongoDB queries (MQL and SQL-like).
"""

import re
import logging
from typing import List, Dict, Any, Tuple
from bson import json_util
from models.metadata import SessionLocal

logger = logging.getLogger(__name__)

class MongoExecutor:
    """Handles execution of MongoDB queries via MQL syntax (e.g. coll.find()) or SQL fallbacks."""

    def __init__(self, service):
        self.service = service

    def execute(self, db_id: str, sql: str, limit: int) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Parses and executes a MongoDB query, returning results and column names."""
        session = SessionLocal()
        try:
            db_type, config = self.service.get_db_config(db_id, session)
            if db_type != 'mongodb':
                raise ValueError(f"Expected mongodb type, got {db_type}")
                
            sql = sql.strip()
            # Match formats like db.collection.find(...) or collection.find(...)
            mql_match = re.match(
                r'^(db|[\w\.-]+)\.(find|aggregate|insertOne|insertMany|updateOne|updateMany|deleteOne|deleteMany|replaceOne|createView)\s*\((.*)\)\s*$', 
                sql, re.DOTALL | re.IGNORECASE
            )
            
            # Simple SQL-like fallback: SELECT * FROM collection
            sql_match = re.search(r'FROM\s+["\']?([\w\.-]+)["\']?', sql, re.IGNORECASE)
            
            collection_name, query_type, args = self._parse_query(mql_match, sql_match, sql)
            
            # Resolve database and collection
            target_db, collection_name = self._resolve_target(collection_name, config)
            
            client, _ = self.service.get_mongo_client(db_id, session)
            if not client:
                raise Exception("Failed to connect to MongoDB cluster")
            
            target_obj = client[target_db] if collection_name.lower() == 'db' else client[target_db][collection_name]
            
            # Map JS-style method names to PyMongo's snake_case
            method_name = self._get_method_name(query_type)
            method = getattr(target_obj, method_name, None)
            
            if not method and method_name != 'command':
                raise Exception(f"Unsupported MongoDB operation: {query_type}")

            return self._run_operation(method, method_name, query_type, args, limit, client, target_db)
        finally:
            session.close()

    # --- Private Helpers ---

    def _parse_query(self, mql_match, sql_match, sql: str) -> Tuple[str, str, List[Any]]:
        """Extracts operation details from the input query string."""
        if mql_match:
            args_str = mql_match.group(3).strip()
            try:
                args = json_util.loads(f"[{args_str}]") if args_str else []
                return mql_match.group(1), mql_match.group(2), args
            except Exception as e:
                raise Exception(f"MQL Parse Error: {e}. Use valid JSON with double quotes.")
        elif sql_match:
            # Default to find({}) for basic SQL syntax
            return sql_match.group(1), 'find', [{}]
        else:
            raise Exception("Unsupported format. Use 'db.collection.find({...})' or 'collection.find({...})'.")

    def _resolve_target(self, coll_name: str, config: Dict[str, Any]) -> Tuple[str, str]:
        """Splits schema.collection format and resolves the target database."""
        parts = coll_name.split('.')
        target_db = config.get('database', 'test')
        if len(parts) > 1:
            target_db = parts[0]
            # Use join for remaining parts safely
            coll_name = ".".join(parts[1:])
        return target_db, coll_name

    def _get_method_name(self, query_type: str) -> str:
        """Translates camelCase JS method names to PyMongo snake_case equivalents."""
        method_map = {
            'find': 'find', 'aggregate': 'aggregate',
            'insertOne': 'insert_one', 'insertMany': 'insert_many',
            'updateOne': 'update_one', 'updateMany': 'update_many',
            'deleteOne': 'delete_one', 'deleteMany': 'delete_many',
            'replaceOne': 'replace_one', 'createView': 'command'
        }
        return method_map.get(query_type, query_type)

    def _run_operation(self, method, py_name, orig_name, args, limit, client, db_name) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Executes the PyMongo operation and formats the result."""
        if py_name == 'find':
            cursor = method(*args).limit(limit)
            return self._process_documents(list(cursor))
        elif py_name == 'aggregate':
            cursor = method(*args)
            docs = [doc for i, doc in enumerate(cursor) if i < limit]
            return self._process_documents(docs)
        elif py_name == 'command' and orig_name == 'createView':
            # createView: [viewName, sourceColl, pipeline]
            result = client[db_name].command({'create': args[0], 'viewOn': args[1], 'pipeline': args[2]})
            return self._format_result({"status": "success", "command": orig_name, "view": args[0]})
        else:
            result = method(*args)
            return self._format_result(self._build_info(result, orig_name))

    def _process_documents(self, docs: List[Dict]) -> Tuple[List[Dict], List[str]]:
        """Serializes BSON documents to standard JSON-compatible formats."""
        processed, columns = [], set()
        for doc in docs:
            p_doc = {k: (str(v) if k == '_id' or not isinstance(v, (str, int, float, bool, list, dict, type(None))) else v) for k, v in doc.items()}
            processed.append(p_doc)
            columns.update(p_doc.keys())
        return processed, sorted(list(columns))

    def _format_result(self, info: Dict) -> Tuple[List[Dict], List[str]]:
        """Formats a single operation info dict as a row/column response."""
        return [info], sorted(list(info.keys()))

    def _build_info(self, result: Any, cmd_type: str) -> Dict[str, Any]:
        """Extracts metadata from PyMongo result objects (inserted IDs, counts, etc.)."""
        info: Dict[str, Any] = {"status": "success", "command": cmd_type}
        for attr in ['inserted_id', 'inserted_ids', 'matched_count', 'modified_count', 'deleted_count', 'acknowledged']:
            val = getattr(result, attr, None)
            if val is not None:
                if isinstance(val, list):
                    info[attr] = [str(i) for i in val]
                elif attr.endswith('id'):
                    info[attr] = str(val)
                else:
                    info[attr] = val
        return info
