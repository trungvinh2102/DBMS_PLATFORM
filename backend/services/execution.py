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

    def execute_query(self, database_id: str, sql: str):
        """
        Executes a SQL query on the target database.

        Args:
            database_id (str): The target database ID.
            sql (str): The SQL query string.

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
            
            def _op(conn):
                # Using execution options for autocommit if needed
                result = conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(sql))
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
