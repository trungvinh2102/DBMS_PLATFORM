"""
ai_task_assignments.py

Routes for AI task catalog and per-user task-to-model routing settings.
"""

from fastapi import APIRouter, Depends, HTTPException, Query

from schemas.ai import SaveAITaskAssignmentsRequest
from services.ai.task_model_router import task_model_router
from utils.auth_middleware import get_current_user

router = APIRouter()


@router.get("/task-catalog")
def get_task_catalog(current_user: dict = Depends(get_current_user)):
    """Return the supported AI task keys and routing hints."""
    return task_model_router.catalog()


@router.get("/task-assignments")
def get_task_assignments(
    databaseId: str | None = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    """Return current user's model assignments for AI tasks."""
    return task_model_router.list_assignments(current_user.get("userId"), databaseId)


@router.put("/task-assignments")
def save_task_assignments(
    data: SaveAITaskAssignmentsRequest,
    current_user: dict = Depends(get_current_user),
):
    """Persist current user's model assignments for AI tasks."""
    try:
        items = [assignment.model_dump() for assignment in data.assignments]
        return task_model_router.upsert_assignments(current_user.get("userId"), items)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
