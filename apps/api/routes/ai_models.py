"""
ai_models.py

Routes for AI provider status and model registry management.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException

from models.metadata import AIModel, SessionLocal
from schemas.ai import AddModelRequest
from services.ai.langchain_runtime import langchain_runtime
from utils.auth_middleware import get_current_user

router = APIRouter()


@router.get("/status")
def get_ai_status(current_user: dict = Depends(get_current_user)):
    """Return AI provider readiness without leaking configured API keys."""
    return langchain_runtime.status(current_user.get("userId"))


@router.get("/models")
def get_models():
    session = SessionLocal()
    try:
        models = session.query(AIModel).all()
        return [model.to_dict() for model in models]
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        session.close()


@router.post("/models", dependencies=[Depends(get_current_user)])
def add_model(data: AddModelRequest):
    session = SessionLocal()
    try:
        session.add(AIModel(
            id=str(uuid.uuid4()),
            name=data.name,
            modelId=data.modelId,
            provider=data.provider,
            description=data.description,
            isActive=True,
        ))
        session.commit()
        return {"message": "Model added successfully"}
    except Exception as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        session.close()


@router.delete("/models/{id}", dependencies=[Depends(get_current_user)])
def delete_model(id: str):
    session = SessionLocal()
    try:
        model = session.query(AIModel).get(id)
        if not model:
            raise HTTPException(status_code=404, detail="Model not found")
        session.delete(model)
        session.commit()
        return {"message": "Model deleted successfully"}
    except HTTPException:
        session.rollback()
        raise
    except Exception as exc:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(exc))
    finally:
        session.close()
