"""
execution_routes.py

API routes for query execution, history management, and saved queries.
"""

from fastapi import APIRouter, Depends
from typing import Optional
from pydantic import BaseModel
from services.execution import execution_service
from utils.auth_middleware import get_current_user
from utils.http_errors import raise_http_error

execution_bp = APIRouter(dependencies=[Depends(get_current_user)])

class ExecuteQueryRequest(BaseModel):
    databaseId: str
    sql: str
    autoCommit: bool = True
    limit: int = 1000

class ExplainQueryRequest(BaseModel):
    databaseId: str
    sql: str

class SaveQueryRequest(BaseModel):
    sql: str
    name: str
    databaseId: str
    description: Optional[str] = None
    userId: Optional[str] = None

@execution_bp.post('/execute')
def execute_query(data: ExecuteQueryRequest):
    """Executes a SQL/MQL query against the specified database instance."""
    try:
        return execution_service.execute_query(data.databaseId, data.sql, data.autoCommit, data.limit)
    except Exception as exc:
        raise_http_error(exc)

@execution_bp.post('/explain')
def explain_query(data: ExplainQueryRequest):
    """Generates an EXPLAIN plan for a given query and returns performance metrics."""
    try:
        return execution_service.get_explain_plan(data.databaseId, data.sql)
    except Exception as exc:
        raise_http_error(exc)

@execution_bp.get('/history')
def get_history(databaseId: Optional[str] = None):
    """Retrieves previous query execution history for the given user/database."""
    try:
        return execution_service.get_query_history(databaseId)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@execution_bp.post('/save-query')
def save_query(data: SaveQueryRequest):
    """Saves a SQL query with a custom label for reuse or future reference."""
    try:
        return execution_service.save_query(data.model_dump(exclude_none=True))
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@execution_bp.get('/saved-queries')
def list_saved_queries(databaseId: Optional[str] = None, userId: Optional[str] = None):
    """Lists all saved queries filtered by database or user."""
    try:
        return execution_service.list_saved_queries(databaseId, userId)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)
