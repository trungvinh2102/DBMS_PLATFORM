"""
execution.py

Service for executing SQL queries and managing query history.
"""

from services.base_service import BaseDatabaseService
from models.metadata import QueryHistory, SavedQuery
from sqlalchemy import text
from datetime import datetime
from utils.db_utils import with_session
import uuid
import logging

logger = logging.getLogger(__name__)

class ExecutionService(BaseDatabaseService):
    """
    Handles SQL execution and query history.
    """

    @with_session
    def execute_query(self, session, database_id: str, sql: str, user_id: str = None):
        """
        Executes a SQL query on the target database, applying masking policies.
        """
        from services.masking_service import MaskingService
        from models.metadata import User
        from sqlalchemy.orm import joinedload

        start_time = datetime.now()
        status = 'SUCCESS'
        error_message = None
        result_data = []
        columns = []
        final_sql = sql
        
        try:
            if not database_id: raise Exception("Database ID required")
            if not sql: raise Exception("SQL required")
            
            # 1. Apply Masking Policies
            if user_id:
                # Fetch user roles
                user = session.query(User).options(joinedload(User.roles)).filter(User.id == user_id).first()
                if user:
                    role_ids = [r.id for r in user.roles] or ([user.roleId] if user.roleId else [])
                    
                    # Get policies
                    policies = MaskingService.get_policies_for_user(session, role_ids)
                    
                    # Rewrite SQL
                    if policies:
                        final_sql = MaskingService.apply_masking(sql, policies)
                        if final_sql != sql:
                            logger.info(f"applied masking to query for user {user_id}")

            # 2. Execute Query (using dynamic connection)
            def _op(conn):
                # We execute the FINAL (masked) SQL
                result = conn.execution_options(isolation_level="AUTOCOMMIT").execute(text(final_sql))
                if result.returns_rows:
                    keys = list(result.keys())
                    data = [dict(zip(keys, row)) for row in result]
                    return data, keys
                return [], []
                
            result_data, columns = self.run_dynamic_query(database_id, _op)
            
        except Exception as e:
            status = 'FAILED'
            error_message = str(e)
            logger.error(f"Query execution failed: {e}")
            
        execution_time_ms = int((datetime.now() - start_time).total_seconds() * 1000)
        
        # Save history (save the ORIGINAL sql to see what they tried to run, or masked? usually original)
        self._save_history(session, database_id, sql, status, execution_time_ms, error_message)
             
        return {
            "data": result_data,
            "columns": columns,
            "executionTime": execution_time_ms,
            "error": error_message,
            "masked": final_sql != sql
        }

    def _save_history(self, session, db_id, sql, status, time_ms, error):
        """
        Internal helper to save query history.
        """
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

    @with_session
    def save_query(self, session, data):
        """
        Saves a query for later use.
        """
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

    @with_session
    def get_query_history(self, session, database_id: str = None, limit: int = 50):
        """
        Retrieves query execution history.
        """
        from models.metadata import Db
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
            
    @with_session
    def list_saved_queries(self, session, database_id: str = None, user_id: str = None):
        """
        Lists saved queries.
        """
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

execution_service = ExecutionService()

