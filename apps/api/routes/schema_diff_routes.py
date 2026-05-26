"""
schema_diff_routes.py

API routes for schema diff previews and migration script generation.
"""

from fastapi import APIRouter, Depends

from schemas.schema_diff import SchemaDiffRequest, SchemaDiffResponse
from services.schema_diff_service import schema_diff_service
from utils.auth_middleware import get_current_user
from utils.http_errors import raise_http_error

schema_diff_bp = APIRouter(dependencies=[Depends(get_current_user)])


@schema_diff_bp.post("/schema-diff", response_model=SchemaDiffResponse)
def compare_schema(data: SchemaDiffRequest):
    """Compares two SQL schemas and returns a migration preview script."""
    try:
        return schema_diff_service.compare(
            source_database_id=data.sourceDatabaseId,
            target_database_id=data.targetDatabaseId,
            source_schema=data.sourceSchema,
            target_schema=data.targetSchema,
            include_destructive=data.includeDestructive,
        )
    except Exception as exc:
        raise_http_error(exc, allow_not_found=False)
