"""
connection_routes.py

API routes for database connection management (CRUD).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from deps import get_db
from schemas.connection import (
    ConnectLocalRequest,
    CreateDatabaseRequest,
    DatabaseConnectionResponse,
    DeleteDatabaseRequest,
    DeleteDatabaseResponse,
    MutationConnectionResponse,
    TestConnectionRequest,
    TestConnectionResponse,
    UpdateDatabaseRequest,
)
from services.connection import connection_service
from services.local_db_service import local_db_service
from utils.auth_middleware import get_current_user, get_admin_user
from utils.http_errors import raise_http_error

connection_bp = APIRouter(dependencies=[Depends(get_current_user)])

@connection_bp.get('/list', response_model=list[DatabaseConnectionResponse])
def list_databases(db: Session = Depends(get_db)):
    """Returns a list of all database connections configured in the system."""
    try:
        return connection_service.list_databases(db)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@connection_bp.post('/create', response_model=MutationConnectionResponse, dependencies=[Depends(get_admin_user)])
def create_database(data: CreateDatabaseRequest, db: Session = Depends(get_db)):
    """Registers a new database connection into the system."""
    try:
        return connection_service.create_database(data.model_dump(exclude_none=True), db)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@connection_bp.post('/update', response_model=MutationConnectionResponse, dependencies=[Depends(get_admin_user)])
def update_database(data: UpdateDatabaseRequest, db: Session = Depends(get_db)):
    """Updates an existing database connection configuration."""
    payload = data.model_dump(exclude_none=True)
    if 'id' not in payload:
        raise HTTPException(status_code=400, detail='Database ID required')
    try:
        return connection_service.update_database(payload['id'], payload, db)
    except Exception as exc:
        raise_http_error(exc)

@connection_bp.post('/delete', response_model=DeleteDatabaseResponse, dependencies=[Depends(get_admin_user)])
def delete_database(data: DeleteDatabaseRequest, db: Session = Depends(get_db)):
    """Removes a database connection and its associated history records."""
    try:
        connection_service.delete_database(data.id, db)
        return {'success': True}
    except Exception as exc:
        raise_http_error(exc)

@connection_bp.post('/test', response_model=TestConnectionResponse, dependencies=[Depends(get_admin_user)])
def test_connection(data: TestConnectionRequest, db: Session = Depends(get_db)):
    """Executes a connectivity test for the provided connection configuration."""
    try:
        return connection_service.test_connection(data.model_dump(exclude_none=True), db)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)

@connection_bp.post('/connect-local', response_model=MutationConnectionResponse)
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
