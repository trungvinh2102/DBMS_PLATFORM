"""
metadata_routes.py

API routes for database schema and object discovery (metadata).
"""

from fastapi import APIRouter, Depends, Query
from typing import Optional
from services.metadata import metadata_service
from services.local_db_service import local_db_service
from utils.auth_middleware import get_current_user
from utils.http_errors import raise_http_error

metadata_bp = APIRouter(dependencies=[Depends(get_current_user)])

@metadata_bp.get('/schemas')
def get_schemas(databaseId: str):
    """Retrieves all schema names from the specified database."""
    try:
        return metadata_service.get_schemas(databaseId)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/tables')
def get_tables(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all table names within a specific schema."""
    try:
        return metadata_service.get_tables(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/columns')
def get_columns(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Fetches column details (name, type, indices) for a given table."""
    try:
        return metadata_service.get_columns(databaseId, schema, table)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/all-columns')
def get_all_columns(databaseId: str, schema: Optional[str] = Query(None)):
    """Returns columns for all tables in the entire schema, for schema visualization."""
    try:
        return metadata_service.get_all_columns(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/ddl')
def get_ddl(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Generates the CREATE TABLE DDL statement for the requested table."""
    try:
        return metadata_service.get_table_ddl(databaseId, schema, table)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/views')
def get_views(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all defined database views within a specific schema."""
    try:
        return metadata_service.get_views(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/functions')
def get_functions(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all stored functions within a specific schema."""
    try:
        return metadata_service.get_functions(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/procedures')
def get_procedures(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all stored procedures within a specific schema."""
    try:
        return metadata_service.get_procedures(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/triggers')
def get_triggers(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all triggers defined on tables within a specific schema."""
    try:
        return metadata_service.get_triggers(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/events')
def get_events(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves scheduled database events within a specific schema."""
    try:
        return metadata_service.get_events(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/all-foreign-keys')
def get_all_foreign_keys(databaseId: str, schema: Optional[str] = Query(None)):
    """Returns all foreign keys for the entire schema, for schema visualization."""
    try:
        return metadata_service.get_all_foreign_keys(databaseId, schema)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/indexes')
def get_indexes(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Retrieves all indices (primary, unique, secondary) for a given table."""
    try:
        return metadata_service.get_indexes(databaseId, schema, table)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/foreign-keys')
def get_foreign_keys(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Retrieves foreign key constraints defined specifically for a given table."""
    try:
        return metadata_service.get_foreign_keys(databaseId, schema, table)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/table-info')
def get_table_info(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Retrieves metadata statistics and size estimate for a given table."""
    try:
        return metadata_service.get_table_info(databaseId, schema, table)
    except Exception as exc:
        raise_http_error(exc)

@metadata_bp.get('/diagnostics')
def get_diagnostics(databaseId: str, table: str):
    """Retrieves advanced statistical profiling (histograms) for a table."""
    try:
        return local_db_service.get_diagnostics(databaseId, table)
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)
