"""
dashboard_routes.py
API routes for dashboard stats.
"""

from fastapi import APIRouter, HTTPException
from services.dashboard_service import dashboard_service
import logging

logger = logging.getLogger(__name__)

dashboard_bp = APIRouter()

@dashboard_bp.get('/stats')
def get_stats(db_id: str):
    """
    Get dashboard stats for a database ID.
    Example: GET /api/database/dashboard/stats?db_id=uuid
    """
    if not db_id:
        raise HTTPException(status_code=400, detail="db_id required")
        
    logger.info(f"Dashboard Stats requested for db_id: {db_id}")
    stats = dashboard_service.get_dashboard_stats(db_id)
    
    if "error" in stats:
        raise HTTPException(status_code=500, detail=stats["error"])
        
    return stats

@dashboard_bp.get('/health')
def health():
    """Blueprint heartbeat."""
    return {"status": "ok"}
