"""
connection_routes.py

API routes for database connection management (CRUD).
"""

from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
from services.connection import connection_service
from utils.auth_middleware import get_current_user, get_admin_user

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
        dbs = connection_service.list_databases()
        return dbs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@connection_bp.post('/create', dependencies=[Depends(get_admin_user)])
def create_database(data: Dict[str, Any] = Body(...)):
    """Registers a new database connection into the system."""
    try:
        result = connection_service.create_database(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@connection_bp.post('/update', dependencies=[Depends(get_admin_user)])
def update_database(data: Dict[str, Any] = Body(...)):
    """Updates an existing database connection configuration."""
    if 'id' not in data:
        raise HTTPException(status_code=400, detail='Database ID required')
    try:
        result = connection_service.update_database(data['id'], data)
        return result
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@connection_bp.post('/delete', dependencies=[Depends(get_admin_user)])
def delete_database(data: DeleteDatabaseRequest):
    """Removes a database connection and its associated history records."""
    try:
        connection_service.delete_database(data.id)
        return {'success': True}
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@connection_bp.post('/test', dependencies=[Depends(get_admin_user)])
def test_connection(data: Dict[str, Any] = Body(...)):
    """Executes a connectivity test for the provided connection configuration."""
    try:
        result = connection_service.test_connection(data)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@connection_bp.post('/connect-local')
def connect_local(data: ConnectLocalRequest):
    """Connects to a local SQLite or DuckDB file."""
    from services.local_db_service import local_db_service
    try:
        result = local_db_service.connect_external_file(
            path=data.path,
            db_type=data.type,
            name=data.name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
