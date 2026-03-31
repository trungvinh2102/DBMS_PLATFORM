"""
execution/__init__.py

Service for executing queries on various database engines and managing history.
Delegates heavy database-specific execution to specialized executors.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime
import uuid
import logging

from services.base_service import BaseDatabaseService
from models.metadata import QueryHistory, SavedQuery, SessionLocal, Db
from services.execution.sql_executor import SqlExecutor
from services.execution.mongo_executor import MongoExecutor
from services.execution.redis_executor import RedisExecutor
from services.execution.explain_executor import ExplainExecutor

logger = logging.getLogger(__name__)

class ExecutionService(BaseDatabaseService):
    """
    Handles query routing, execution, and history persistence.
    Acts as a facade for SqlExecutor, MongoExecutor, and RedisExecutor.
    """

    def __init__(self):
        super().__init__()
        self.sql_executor = SqlExecutor(self)
        self.mongo_executor = MongoExecutor(self)
        self.redis_executor = RedisExecutor(self)
        self.explain_executor = ExplainExecutor(self)

    def execute_query(self, database_id: str, sql: str, auto_commit: bool = True, limit: int = 1000) -> Dict[str, Any]:
        """Routes and executes a query, persisting the outcome to history."""
        start_time = datetime.now()
        status = 'SUCCESS'
        error_message = None
        data, columns = [], []
        
        try:
            if not database_id or not sql:
                raise ValueError("Database ID and SQL query are required.")

            # Resolve db_type to determine correct executor
            session = SessionLocal()
            try:
                db_type, _ = self.get_db_config(database_id, session)
            finally:
                session.close()

            # Delegate execution based on engine type
            if db_type == 'mongodb':
                data, columns = self.mongo_executor.execute(database_id, sql, limit)
            elif db_type == 'redis':
                data, columns = self.redis_executor.execute(database_id, sql, limit)
            else:
                data, columns = self.sql_executor.execute(database_id, sql, limit, auto_commit)
            
        except Exception as e:
            status = 'FAILED'
            error_message = str(e)
            logger.error(f"Execution failed for {database_id}: {status} - {error_message}")
            
        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        self._save_history(database_id, sql, status, execution_time_ms, error_message)
             
        return {
            "data": data,
            "columns": columns,
            "executionTime": execution_time_ms,
            "error": error_message
        }

    def get_explain_plan(self, database_id: str, sql: str) -> Dict[str, Any]:
        """Routes an EXPLAIN request to the ExplainExecutor."""
        if not database_id or not sql:
            raise ValueError("Database ID and SQL query are required.")

        session = SessionLocal()
        try:
            db_type, _ = self.get_db_config(database_id, session)
        finally:
            session.close()

        # We only support EXPLAIN for SQL relational DBs for now
        if db_type in ['mongodb', 'redis']:
             raise ValueError("Performance Insights (EXPLAIN) is currently only supported for SQL databases.")

        return self.explain_executor.execute(database_id, sql)

    def _save_history(self, db_id: str, sql: str, status: str, time_ms: int, error: Optional[str]):
        """Persists the outcome of a query execution for later analysis."""
        session = SessionLocal()
        try:
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
        except Exception as ex:
             logger.error(f"Failed to save history: {ex}")
        finally:
             session.close()

    def save_query(self, data: Dict[str, Any]) -> Dict[str, str]:
        """Stores a named query in the user's library."""
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
        except Exception as e:
            logger.error(f"Failed to save query: {e}")
            raise
        finally:
            session.close()

    def get_query_history(self, database_id: Optional[str] = None, limit: int = 50) -> List[Dict[str, Any]]:
        """Retrieves and serializes query execution history, optionally filtered by database."""
        session = SessionLocal()
        try:
            query = session.query(QueryHistory).order_by(QueryHistory.created_on.desc())
            if database_id:
                query = query.filter(QueryHistory.databaseId == database_id)
            
            history = query.limit(limit).all()
            
            # Efficiently map database names for the front-end display
            db_ids = list(set(h.databaseId for h in history if h.databaseId))
            db_map = {db.id: db.databaseName for db in session.query(Db).filter(Db.id.in_(db_ids)).all()} if db_ids else {}
            
            return [{
                "id": h.id, "sql": h.sql, "status": h.status,
                "executionTime": h.executionTime, "errorMessage": h.errorMessage,
                "databaseId": h.databaseId, "executedAt": h.executedAt.isoformat() if h.executedAt else None,
                "created_on": h.created_on.isoformat() if h.created_on else None,
                "database": {"databaseName": db_map.get(h.databaseId, "Unknown")}
            } for h in history]
        except Exception as e:
            logger.error(f"Failed to retrieve history: {e}")
            return []
        finally:
            session.close()
            
    def list_saved_queries(self, database_id: Optional[str] = None, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Lists saved queries, optionally filtered by database or user ownership."""
        session = SessionLocal()
        try:
            query = session.query(SavedQuery).order_by(SavedQuery.changed_on.desc())
            if database_id: query = query.filter(SavedQuery.databaseId == database_id)
            if user_id: query = query.filter(SavedQuery.userId == user_id)
                
            return [{
                "id": q.id, "name": q.name, "description": q.description,
                "sql": q.sql, "databaseId": q.databaseId
            } for q in query.all()]
        except Exception as e:
            logger.error(f"Failed to list saved queries: {e}")
            return []
        finally:
            session.close()

execution_service = ExecutionService()
