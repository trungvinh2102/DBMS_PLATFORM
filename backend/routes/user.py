"""
user.py

User profile and settings endpoints.
"""

from flask import Blueprint, request, jsonify, g
from services.user_service import user_service
from utils.auth_middleware import login_required
from utils.db_utils import handle_api_exceptions

user_bp = Blueprint('user', __name__)

@user_bp.route('/me', methods=['GET'])
@login_required
@handle_api_exceptions
def get_me():
    """Get current user profile."""
    profile = user_service.get_profile(g.user['userId'])
    return jsonify(profile)

@user_bp.route('/settings', methods=['GET'])
@login_required
@handle_api_exceptions
def get_settings():
    """Get current user settings."""
    settings = user_service.get_settings(g.user['userId'])
    return jsonify(settings)

@user_bp.route('/settings', methods=['POST'])
@login_required
@handle_api_exceptions
def update_settings():
    """Update current user settings."""
    data = request.json
    user_service.update_settings(g.user['userId'], data)
    return jsonify({'success': True})
