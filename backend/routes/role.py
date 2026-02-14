"""
role.py

API routes for Role management.
"""

from flask import Blueprint, request, jsonify
from services.role_service import role_service
from utils.auth_middleware import login_required, admin_required
from utils.db_utils import handle_api_exceptions

role_bp = Blueprint('role', __name__)

@role_bp.route('/', methods=['GET'])
@login_required
@handle_api_exceptions
def list_roles():
    """List all roles."""
    roles = role_service.list_roles()
    return jsonify(roles)

@role_bp.route('/hierarchy', methods=['GET'])
@login_required
@handle_api_exceptions
def get_role_hierarchy():
    """Get role hierarchy."""
    roles = role_service.get_role_hierarchy()
    return jsonify(roles)

@role_bp.route('/<role_id>', methods=['GET'])
@login_required
@handle_api_exceptions
def get_role(role_id):
    """Get a single role."""
    role = role_service.get_role(role_id)
    if not role:
        return jsonify({'error': 'Role not found'}), 404
    return jsonify(role)

@role_bp.route('/', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def create_role():
    """Create a new role (Admin only)."""
    data = request.json
    if not data.get('name'):
        return jsonify({'error': 'name is required'}), 400
    new_role = role_service.create_role(data)
    return jsonify(new_role), 201

@role_bp.route('/<role_id>', methods=['PUT'])
@login_required
@admin_required
@handle_api_exceptions
def update_role(role_id):
    """Update a role (Admin only)."""
    data = request.json
    updated_role = role_service.update_role(role_id, data)
    return jsonify(updated_role)

@role_bp.route('/<role_id>', methods=['DELETE'])
@login_required
@admin_required
@handle_api_exceptions
def delete_role(role_id):
    """Delete a role (Admin only)."""
    result = role_service.delete_role(role_id)
    return jsonify(result)
