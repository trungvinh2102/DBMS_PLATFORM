"""
metadata_routes.py

API routes for database schema and object discovery (metadata).
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from services.metadata import metadata_service
from utils.auth_middleware import get_current_user

metadata_bp = APIRouter(dependencies=[Depends(get_current_user)])

@metadata_bp.get('/schemas')
def get_schemas(databaseId: str):
    """Retrieves all schema names from the specified database."""
    try:
        schemas = metadata_service.get_schemas(databaseId)
        return schemas
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/tables')
def get_tables(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all table names within a specific schema."""
    try:
        tables = metadata_service.get_tables(databaseId, schema)
        return tables
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/columns')
def get_columns(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Fetches column details (name, type, indices) for a given table."""
    try:
        columns = metadata_service.get_columns(databaseId, schema, table)
        return columns
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/all-columns')
def get_all_columns(databaseId: str, schema: Optional[str] = Query(None)):
    """Returns columns for all tables in the entire schema, for schema visualization."""
    try:
        all_columns = metadata_service.get_all_columns(databaseId, schema)
        return all_columns
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/ddl')
def get_ddl(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Generates the CREATE TABLE DDL statement for the requested table."""
    try:
        ddl = metadata_service.get_table_ddl(databaseId, schema, table)
        return ddl
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/views')
def get_views(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all defined database views within a specific schema."""
    try:
        views = metadata_service.get_views(databaseId, schema)
        return views
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/functions')
def get_functions(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all stored functions within a specific schema."""
    try:
        functions = metadata_service.get_functions(databaseId, schema)
        return functions
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/procedures')
def get_procedures(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all stored procedures within a specific schema."""
    try:
        procedures = metadata_service.get_procedures(databaseId, schema)
        return procedures
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/triggers')
def get_triggers(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves all triggers defined on tables within a specific schema."""
    try:
        triggers = metadata_service.get_triggers(databaseId, schema)
        return triggers
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/events')
def get_events(databaseId: str, schema: Optional[str] = Query(None)):
    """Retrieves scheduled database events within a specific schema."""
    try:
        events = metadata_service.get_events(databaseId, schema)
        return events
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/all-foreign-keys')
def get_all_foreign_keys(databaseId: str, schema: Optional[str] = Query(None)):
    """Returns all foreign keys for the entire schema, for schema visualization."""
    try:
        fks = metadata_service.get_all_foreign_keys(databaseId, schema)
        return fks
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/indexes')
def get_indexes(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Retrieves all indices (primary, unique, secondary) for a given table."""
    try:
        indexes = metadata_service.get_indexes(databaseId, schema, table)
        return indexes
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/foreign-keys')
def get_foreign_keys(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Retrieves foreign key constraints defined specifically for a given table."""
    try:
        fks = metadata_service.get_foreign_keys(databaseId, schema, table)
        return fks
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/table-info')
def get_table_info(databaseId: str, table: str, schema: Optional[str] = Query(None)):
    """Retrieves metadata statistics and size estimate for a given table."""
    try:
        info = metadata_service.get_table_info(databaseId, schema, table)
        return info
    except Exception as e:
        status = 404 if "not found" in str(e).lower() else 500
        raise HTTPException(status_code=status, detail=str(e))

@metadata_bp.get('/diagnostics')
def get_diagnostics(databaseId: str, table: str):
    """Retrieves advanced statistical profiling (histograms) for a table."""
    from services.local_db_service import local_db_service
    try:
        diagnostics = local_db_service.get_diagnostics(databaseId, table)
        return diagnostics
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
