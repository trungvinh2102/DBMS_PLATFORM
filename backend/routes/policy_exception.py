"""
policy_exception.py

API routes for Policy Exception management.
"""
from flask import Blueprint, request, jsonify, g
from services.policy_exception_service import policy_exception_service
from utils.auth_middleware import login_required, admin_required
from utils.db_utils import handle_api_exceptions
import logging

logger = logging.getLogger(__name__)

policy_exception_bp = Blueprint('policy_exception', __name__)

@policy_exception_bp.route('/', methods=['GET'])
@login_required
@handle_api_exceptions
def list_exceptions():
    """List policy exceptions."""
    status = request.args.get('status')
    if status == 'ALL':
        status = None
    subject_id = request.args.get('subjectId')
    result = policy_exception_service.list_exceptions(status=status, subject_id=subject_id)
    return jsonify(result)

@policy_exception_bp.route('/<exception_id>', methods=['GET'])
@login_required
@handle_api_exceptions
def get_exception(exception_id):
    """Get a single exception by ID."""
    result = policy_exception_service.get_exception(exception_id)
    if not result:
        return jsonify({'error': 'Exception not found'}), 404
    return jsonify(result)

@policy_exception_bp.route('/', methods=['POST'])
@login_required
@handle_api_exceptions
def request_exception():
    """Request a new policy exception."""
    data = request.json
    user_id = g.user.get('userId')
    logger.info(f"API Request: data={data}, user_id={user_id}, g.user={g.user}")
    result = policy_exception_service.create_exception(data, user_id)
    return jsonify(result), 201

@policy_exception_bp.route('/<exception_id>/approve', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def approve_exception(exception_id):
    """Approve a pending exception."""
    admin_id = g.user.get('userId')
    result = policy_exception_service.approve_exception(exception_id, admin_id)
    return jsonify(result)

@policy_exception_bp.route('/<exception_id>/reject', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def reject_exception(exception_id):
    """Reject a pending exception."""
    data = request.json or {}
    admin_id = g.user.get('userId')
    reason = data.get('reason')
    result = policy_exception_service.reject_exception(exception_id, admin_id, reason)
    return jsonify(result)

@policy_exception_bp.route('/<exception_id>/revoke', methods=['POST'])
@login_required
@handle_api_exceptions
def revoke_exception(exception_id):
    """Revoke an approved exception."""
    user_id = g.user.get('userId')
    result = policy_exception_service.revoke_exception(exception_id, user_id)
    return jsonify(result)
