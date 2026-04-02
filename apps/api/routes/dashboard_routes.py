"""
dashboard_routes.py
API routes for dashboard stats.
"""

from flask import Blueprint, request, jsonify
from services.dashboard_service import dashboard_service
import logging

logger = logging.getLogger(__name__)

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/stats', methods=['GET'])
def get_stats():
    """
    Get dashboard stats for a database ID.
    Example: GET /api/database/dashboard/stats?db_id=uuid
    """
    db_id = request.args.get('db_id')
    if not db_id:
        return jsonify(error="db_id required"), 400
        
    logger.info(f"Dashboard Stats requested for db_id: {db_id}")
    stats = dashboard_service.get_dashboard_stats(db_id)
    
    if "error" in stats:
        return jsonify(error=stats["error"]), 500
        
    return jsonify(stats)

@dashboard_bp.route('/health', methods=['GET'])
def health():
    """Blueprint heartbeat."""
    return jsonify(status="ok")
