"""
user.py

User profile, settings, and role management endpoints.
"""

from flask import Blueprint, request, jsonify, g
from services.user_service import user_service
from services.privilege_service import privilege_service
from utils.auth_middleware import login_required, admin_required
from utils.db_utils import handle_api_exceptions

user_bp = Blueprint('user', __name__)

# ── User Profile & Settings ──────────────────────────────────────

@user_bp.route('/me', methods=['GET'])
@login_required
@handle_api_exceptions
def get_me():
    """Get current user profile."""
    profile = user_service.get_profile(g.user['userId'])
    return jsonify(profile)

@user_bp.route('/me/privileges', methods=['GET'])
@login_required
@handle_api_exceptions
def get_my_privileges():
    """Get effective privileges for current user."""
    privileges = privilege_service.get_user_privileges(g.user['userId'])
    return jsonify(privileges)

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

# ── User Management (Admin) ──────────────────────────────────────

@user_bp.route('/', methods=['GET'])
@login_required
@admin_required
@handle_api_exceptions
def list_users():
    """List all users (Admin only)."""
    users = user_service.list_users()
    return jsonify(users)

@user_bp.route('/<user_id>/roles', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def add_role(user_id):
    """Assign a role to a user (Admin only)."""
    data = request.json
    if not data.get('roleId'):
        return jsonify({'error': 'roleId is required'}), 400
    
    result = user_service.add_role_to_user(user_id, data['roleId'])
    return jsonify(result), 201

@user_bp.route('/<user_id>/roles/<role_id>', methods=['DELETE'])
@login_required
@admin_required
@handle_api_exceptions
def remove_role(user_id, role_id):
    """Remove a role from a user (Admin only)."""
    result = user_service.remove_role_from_user(user_id, role_id)
    return jsonify(result)
