"""
connection_routes.py

API routes for database connection management (CRUD).
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
from services.connection import connection_service
from services.local_db_service import local_db_service
from utils.auth_middleware import get_current_user, get_admin_user
from utils.http_errors import raise_http_error

connection_bp = APIRouter(dependencies=[Depends(get_current_user)])

class DeleteDatabaseRequest(BaseModel):
    id: str

class ConnectLocalRequest(BaseModel):
    path: str
    type: str
    name: Optional[str] = None

@connection_bp.get('/list')
def list_databases():
    """Returns a list of all database connections configured in the system."""
    try:
        return connection_service.list_databases()
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@connection_bp.post('/create', dependencies=[Depends(get_admin_user)])
def create_database(data: Dict[str, Any] = Body(...)):
    """Registers a new database connection into the system."""
    try:
        return connection_service.create_database(data)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@connection_bp.post('/update', dependencies=[Depends(get_admin_user)])
def update_database(data: Dict[str, Any] = Body(...)):
    """Updates an existing database connection configuration."""
    if 'id' not in data:
        raise HTTPException(status_code=400, detail='Database ID required')
    try:
        return connection_service.update_database(data['id'], data)
    except Exception as exc:
        raise_http_error(exc)

@connection_bp.post('/delete', dependencies=[Depends(get_admin_user)])
def delete_database(data: DeleteDatabaseRequest):
    """Removes a database connection and its associated history records."""
    try:
        connection_service.delete_database(data.id)
        return {'success': True}
    except Exception as exc:
        raise_http_error(exc)

@connection_bp.post('/test', dependencies=[Depends(get_admin_user)])
def test_connection(data: Dict[str, Any] = Body(...)):
    """Executes a connectivity test for the provided connection configuration."""
    try:
        return connection_service.test_connection(data)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@connection_bp.post('/connect-local')
def connect_local(data: ConnectLocalRequest):
    """Connects to a local SQLite or DuckDB file."""
    try:
        return local_db_service.connect_external_file(
            path=data.path,
            db_type=data.type,
            name=data.name
        )
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)
