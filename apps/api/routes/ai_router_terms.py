"""
ai_router_terms.py

Routes for managing configurable AI router keyword terms.
"""

from fastapi import APIRouter, Depends, HTTPException

from schemas.ai import CreateAIRouterTermRequest, UpdateAIRouterTermRequest
from services.ai.router_terms import router_term_service
from utils.auth_middleware import get_current_user

router = APIRouter(dependencies=[Depends(get_current_user)])


@router.get("/router-terms")
def list_router_terms():
    """Return router term sets and their individual keyword rows."""
    return router_term_service.list_term_sets()


@router.post("/router-terms")
def create_router_term(data: CreateAIRouterTermRequest):
    """Create one router keyword row."""
    try:
        return router_term_service.create_term(data.model_dump())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.put("/router-terms/{term_id}")
def update_router_term(term_id: str, data: UpdateAIRouterTermRequest):
    """Update one router keyword row."""
    try:
        return router_term_service.update_term(term_id, data.model_dump(exclude_unset=True))
    except ValueError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/router-terms/{term_id}")
def delete_router_term(term_id: str):
    """Delete custom terms or disable system terms."""
    try:
        return router_term_service.delete_term(term_id)
    except ValueError as exc:
        raise HTTPException(status_code=404 if "not found" in str(exc).lower() else 400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
