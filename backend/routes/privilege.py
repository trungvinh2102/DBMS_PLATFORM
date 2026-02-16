"""
privilege.py

API routes for Privilege Type management and assignments.
"""

from flask import Blueprint, request, jsonify
from services.privilege_service import privilege_service
from utils.auth_middleware import login_required, admin_required
from utils.db_utils import handle_api_exceptions

privilege_bp = Blueprint('privilege', __name__)


# ── Privilege Types CRUD ───────────────────────────────────────────

@privilege_bp.route('/types', methods=['GET'])
@login_required
@handle_api_exceptions
def list_privilege_types():
    """List all privilege types, optionally filtered by ?category=DATA_ACCESS"""
    category = request.args.get('category')
    result = privilege_service.list_privilege_types(category=category)
    return jsonify(result)


@privilege_bp.route('/types/<privilege_id>', methods=['GET'])
@login_required
@handle_api_exceptions
def get_privilege_type(privilege_id):
    """Get a single privilege type by ID."""
    result = privilege_service.get_privilege_type(privilege_id)
    if not result:
        return jsonify({'error': 'Privilege type not found'}), 404
    return jsonify(result)


@privilege_bp.route('/types', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def create_privilege_type():
    """Create a new privilege type (Admin only)."""
    data = request.json
    if not data.get('code') or not data.get('category'):
        return jsonify({'error': 'code and category are required'}), 400
    result = privilege_service.create_privilege_type(data)
    return jsonify(result), 201


@privilege_bp.route('/types/<privilege_id>', methods=['PUT'])
@login_required
@admin_required
@handle_api_exceptions
def update_privilege_type(privilege_id):
    """Update a privilege type (Admin only)."""
    data = request.json
    result = privilege_service.update_privilege_type(privilege_id, data)
    return jsonify(result)


@privilege_bp.route('/types/<privilege_id>', methods=['DELETE'])
@login_required
@admin_required
@handle_api_exceptions
def delete_privilege_type(privilege_id):
    """Delete a privilege type (Admin only)."""
    result = privilege_service.delete_privilege_type(privilege_id)
    return jsonify(result)


# ── Role Privileges (Assignments) ──────────────────────────────────

@privilege_bp.route('/role-privileges', methods=['GET'])
@login_required
@handle_api_exceptions
def list_role_privileges():
    """List role privileges, optionally filtered by ?roleId=<id>"""
    role_id = request.args.get('roleId')
    resource_type = request.args.get('resourceType')
    resource_id = request.args.get('resourceId')
    result = privilege_service.list_role_privileges(role_id=role_id, resource_type=resource_type, resource_id=resource_id)
    return jsonify(result)


@privilege_bp.route('/role-privileges', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def assign_privilege():
    """Assign a privilege to a role (Admin only)."""
    data = request.json
    if not data.get('roleId') or not data.get('privilegeTypeId'):
        return jsonify({'error': 'roleId and privilegeTypeId are required'}), 400
    result = privilege_service.assign_privilege(data)
    return jsonify(result), 201


@privilege_bp.route('/role-privileges/<rp_id>', methods=['DELETE'])
@login_required
@admin_required
@handle_api_exceptions
def revoke_privilege(rp_id):
    """Revoke a privilege from a role (Admin only)."""
    result = privilege_service.revoke_privilege(rp_id)
    return jsonify(result)


# ── Utility Endpoints ──────────────────────────────────────────────

@privilege_bp.route('/categories', methods=['GET'])
@login_required
@handle_api_exceptions
def get_categories():
    """Get list of available privilege categories."""
    return jsonify(privilege_service.get_categories())


@privilege_bp.route('/resource-types', methods=['GET'])
@login_required
@handle_api_exceptions
def get_resource_types():
    """Get list of available resource types."""
    return jsonify(privilege_service.get_resource_types())


@privilege_bp.route('/seed', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def seed_defaults():
    """Seed default privilege types (Admin only)."""
    result = privilege_service.seed_defaults()
    return jsonify(result)

@privilege_bp.route('/user-permissions/<user_id>', methods=['GET'])
@login_required
@handle_api_exceptions
def get_user_permissions(user_id):
    """Get all effective permissions for a user."""
    # Only allow checking own permissions or if Admin
    current_user_id = g.user['userId']
    role = g.user.get('role')
    
    if current_user_id != user_id and role != 'Admin':
         return jsonify({'error': 'Unauthorized'}), 403
         
    result = privilege_service.get_user_privileges(user_id)
    return jsonify(result)
