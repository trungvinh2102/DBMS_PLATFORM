"""
ai.py

Aggregate router for QurioDB AI Assistant endpoints.
"""

from fastapi import APIRouter

from .ai_conversations import router as conversations_router
from .ai_diagnostics import router as diagnostics_router
from .ai_generation import router as generation_router
from .ai_models import router as models_router
from .ai_stream import router as stream_router
from .ai_task_assignments import router as task_assignments_router

ai_bp = APIRouter()
ai_bp.include_router(models_router)
ai_bp.include_router(generation_router)
ai_bp.include_router(stream_router)
ai_bp.include_router(conversations_router)
ai_bp.include_router(diagnostics_router)
ai_bp.include_router(task_assignments_router)
