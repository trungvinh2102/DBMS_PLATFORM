"""
execution_routes.py

API routes for query execution, history management, and saved queries.
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
from services.execution import execution_service
from utils.auth_middleware import get_current_user

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
        result = execution_service.execute_query(data.databaseId, data.sql, data.autoCommit, data.limit)
        return result
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@execution_bp.post('/explain')
def explain_query(data: ExplainQueryRequest):
    """Generates an EXPLAIN plan for a given query and returns performance metrics."""
    try:
        result = execution_service.get_explain_plan(data.databaseId, data.sql)
        return result
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@execution_bp.get('/history')
def get_history(databaseId: Optional[str] = None):
    """Retrieves previous query execution history for the given user/database."""
    try:
        history = execution_service.get_query_history(databaseId)
        return history
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@execution_bp.post('/save-query')
def save_query(data: SaveQueryRequest):
    """Saves a SQL query with a custom label for reuse or future reference."""
    try:
        result = execution_service.save_query(data.model_dump(exclude_none=True))
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@execution_bp.get('/saved-queries')
def list_saved_queries(databaseId: Optional[str] = None, userId: Optional[str] = None):
    """Lists all saved queries filtered by database or user."""
    try:
        queries = execution_service.list_saved_queries(databaseId, userId)
        return queries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
