"""
backend/services/execution.py

Service for executing global SQL queries and managing history.
"""

from services.base_service import BaseDatabaseService
from models.metadata import QueryHistory, SavedQuery, SessionLocal
from sqlalchemy import text
from datetime import datetime
import uuid
import logging

logger = logging.getLogger(__name__)

class ExecutionService(BaseDatabaseService):
    """
    Handles SQL execution and query history.
    """
    def _execute_mongodb(self, database_id, sql, limit):
        """Native MongoDB execution for simple SELECT-like queries."""
        session = SessionLocal()
        try:
            db_type, config = self.get_db_config(database_id, session)
            if db_type != 'mongodb': return None
            
            from pymongo import MongoClient
            import re
            
            # Simple SQL parsing for "SELECT ... FROM collection"
            match = re.search(r'FROM\s+["\']?([\w\.-]+)["\']?', sql, re.IGNORECASE)
            if not match:
                # Fallback or error if not a select
                if "SHOW" in sql.upper() or "LIST" in sql.upper():
                    return [], []
                raise Exception("Only 'SELECT ... FROM collection' is currently supported for direct MongoDB connection.")
            
            collection_name = match.group(1)
            # Handle schema.collection format (e.g., admin.system.users)
            parts = collection_name.split('.')
            target_db = config.get('database', 'test')
            
            # Use the first part as db if it looks like a schema from the UI (e.g. admin)
            if len(parts) > 1:
                target_db = parts[0]
                collection_name = ".".join(parts[1:])

            host = config.get('host', '127.0.0.1')
            raw_port = config.get('port')
            try:
                port = int(raw_port) if raw_port else 27017
            except:
                port = 27017
                
            user = config.get('user')
            password = config.get('password')
            
            client = MongoClient(
                host=host, 
                port=port, 
                username=user, 
                password=password, 
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000
            )
            
            collection = client[target_db][collection_name]
            cursor = collection.find().limit(limit)
            
            data = []
            columns = set()
            for doc in cursor:
                processed_doc = {}
                for k, v in doc.items():
                    if k == '_id' or not isinstance(v, (str, int, float, bool, list, dict, type(None))):
                        v = str(v)
                    processed_doc[k] = v
                    columns.add(k)
                data.append(processed_doc)
            
            return data, sorted(list(columns))
        finally:
            session.close()

    def execute_query(self, database_id: str, sql: str, auto_commit: bool = True, limit: int = 1000):
        """
        Executes a SQL query on the target database.

        Args:
            database_id (str): The target database ID.
            sql (str): The SQL query string.
            auto_commit (bool): Whether to auto-commit the transaction.

        Returns:
            dict: {data, columns, executionTime, error}
        """
        start_time = datetime.now()
        status = 'SUCCESS'
        error_message = None
        result_data = []
        columns = []
        
        try:
            if not database_id: raise Exception("Database ID required")
            if not sql: raise Exception("SQL required")

            # Pre-check database type for native execution
            temp_session = SessionLocal()
            try:
                db_type, _ = self.get_db_config(database_id, temp_session)
                if db_type == 'mongodb':
                    result_data, columns = self._execute_mongodb(database_id, sql, limit)
                    execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
                    self._save_history(database_id, sql, 'SUCCESS', execution_time_ms, None)
                    return {
                        "data": result_data,
                        "columns": columns,
                        "executionTime": execution_time_ms,
                        "error": None
                    }
            finally:
                temp_session.close()
            
            def _op(conn):
                import re
                final_sql = sql.strip()
                
                # Strip trailing semicolon if it exists before appending LIMIT
                if final_sql.endswith(';'):
                    final_sql = final_sql[:-1].strip()
                    
                dialect = conn.engine.dialect.name
                upper_sql = final_sql.upper()
                
                is_select = bool(re.match(r'^\s*SELECT\s', upper_sql))
                
                if is_select:
                    if dialect == 'mssql':
                        # Basic check for TOP clause in SQL Server
                        if not re.search(r'^\s*SELECT\s+TOP\s+\d+', upper_sql):
                            final_sql = re.sub(r'(?i)^\s*SELECT\s+', f'SELECT TOP {limit} ', final_sql)
                    else:
                        # Postgres, MySQL, SQLite
                        if not re.search(r'\sLIMIT\s+\d+(\s+OFFSET\s+\d+)?\s*$', upper_sql):
                            final_sql = f"{final_sql} LIMIT {limit}"

                # Prepare connection with autocommit if requested
                exec_conn = conn
                if auto_commit:
                    exec_conn = conn.execution_options(isolation_level="AUTOCOMMIT")

                # Add basic timeouts for postgresql to prevent runaway queries
                if dialect == 'postgresql':
                     # 30 seconds timeout
                     exec_conn.execute(text("SET statement_timeout = '30s'"))

                result = exec_conn.execute(text(final_sql))
                # Intentionally not calling conn.commit() if not autocommit, 
                # changes will only persist if there's an explicit COMMIT in the SQL itself.
                if result.returns_rows:
                    keys = list(result.keys())
                    data = [dict(zip(keys, row)) for row in result]
                    return data, keys
                return [], []
                
            result_data, columns = self.run_dynamic_query(database_id, _op)
            
        except Exception as e:
            status = 'FAILED'
            error_message = str(e)
            
        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        self._save_history(database_id, sql, status, execution_time_ms, error_message)
             
        return {
            "data": result_data,
            "columns": columns,
            "executionTime": execution_time_ms,
            "error": error_message
        }

    def _save_history(self, db_id, sql, status, time_ms, error):
        """
        Internal helper to save query history.
        """
        try:
             session = SessionLocal()
             history = QueryHistory(
                 id=str(uuid.uuid4()),
                 sql=sql,
                 status=status,
                 executionTime=time_ms,
                 errorMessage=error[:500] if error else None,
                 databaseId=db_id
             )
             session.add(history)
             session.commit()
             session.close()
        except Exception as ex:
             logger.error(f"Failed to save history: {ex}")

    def save_query(self, data):
        """
        Saves a query for later use.
        """
        session = SessionLocal()
        try:
            q = SavedQuery(
                id=str(uuid.uuid4()),
                name=data['name'],
                description=data.get('description'),
                sql=data['sql'],
                databaseId=data['databaseId'],
                userId=data.get('userId')
            )
            session.add(q)
            session.commit()
            return {"id": q.id, "name": q.name}
        finally:
            session.close()

    def get_query_history(self, database_id: str = None, limit: int = 50):
        """
        Retrieves query execution history.
        """
        from models.metadata import Db
        session = SessionLocal()
        try:
            query = session.query(QueryHistory).order_by(QueryHistory.created_on.desc())
            if database_id:
                query = query.filter(QueryHistory.databaseId == database_id)
            
            history = query.limit(limit).all()
            
            # Fetch database names for lookup
            db_ids = list(set(h.databaseId for h in history if h.databaseId))
            db_map = {}
            if db_ids:
                dbs = session.query(Db).filter(Db.id.in_(db_ids)).all()
                db_map = {db.id: db.databaseName for db in dbs}
            
            # Serialize with database info for frontend compatibility
            return [{
                "id": h.id,
                "sql": h.sql,
                "status": h.status,
                "executionTime": h.executionTime,
                "errorMessage": h.errorMessage,
                "databaseId": h.databaseId,
                "executedAt": h.executedAt.isoformat() if h.executedAt else None,
                "created_on": h.created_on.isoformat() if h.created_on else None,
                "database": {
                    "databaseName": db_map.get(h.databaseId, "Unknown")
                }
            } for h in history]
        finally:
            session.close()
            
    def list_saved_queries(self, database_id: str = None, user_id: str = None):
        """
        Lists saved queries.
        """
        session = SessionLocal()
        try:
            query = session.query(SavedQuery).order_by(SavedQuery.changed_on.desc())
            if database_id:
                query = query.filter(SavedQuery.databaseId == database_id)
            if user_id:
                query = query.filter(SavedQuery.userId == user_id)
                
            queries = query.all()
            return [{
                "id": q.id,
                "name": q.name,
                "description": q.description,
                "sql": q.sql,
                "databaseId": q.databaseId
            } for q in queries]
        finally:
            session.close()


execution_service = ExecutionService()
