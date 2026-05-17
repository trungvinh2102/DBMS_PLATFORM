"""
execution_routes.py

API routes for query execution, history management, and saved queries.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from deps import get_db
from schemas.execution import (
    ExecuteQueryRequest,
    ExecuteQueryResponse,
    ExplainQueryRequest,
    QueryHistoryResponse,
    SavedQueryResponse,
    SaveQueryRequest,
)
from services.execution import execution_service
from utils.auth_middleware import get_current_user
from utils.http_errors import raise_http_error

execution_bp = APIRouter(dependencies=[Depends(get_current_user)])

@execution_bp.post('/execute', response_model=ExecuteQueryResponse)
def execute_query(data: ExecuteQueryRequest, db: Session = Depends(get_db)):
    """Executes a SQL/MQL query against the specified database instance."""
    try:
        return execution_service.execute_query(data.databaseId, data.sql, db, data.autoCommit, data.limit)
    except Exception as exc:
        raise_http_error(exc)

@execution_bp.post('/explain')
def explain_query(data: ExplainQueryRequest, db: Session = Depends(get_db)):
    """Generates an EXPLAIN plan for a given query and returns performance metrics."""
    try:
        return execution_service.get_explain_plan(data.databaseId, data.sql, db)
    except Exception as exc:
        raise_http_error(exc)

@execution_bp.get('/history', response_model=list[QueryHistoryResponse])
def get_history(databaseId: str | None = None, db: Session = Depends(get_db)):
    """Retrieves previous query execution history for the given user/database."""
    try:
        return execution_service.get_query_history(db, databaseId)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@execution_bp.post('/save-query', response_model=SavedQueryResponse)
def save_query(data: SaveQueryRequest, db: Session = Depends(get_db)):
    """Saves a SQL query with a custom label for reuse or future reference."""
    try:
        return execution_service.save_query(data.model_dump(exclude_none=True), db)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@execution_bp.get('/saved-queries', response_model=list[SavedQueryResponse])
def list_saved_queries(databaseId: str | None = None, userId: str | None = None, db: Session = Depends(get_db)):
    """Lists all saved queries filtered by database or user."""
    try:
        return execution_service.list_saved_queries(db, databaseId, userId)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)
