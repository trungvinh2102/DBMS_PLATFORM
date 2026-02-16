
"""
access_requests.py

API routes for managing access requests.
"""

from flask import Blueprint, request, jsonify, g
from services.access_request_service import access_request_service
from utils.auth_middleware import login_required, admin_required
from utils.db_utils import handle_api_exceptions

access_requests_bp = Blueprint('access_requests', __name__)

@access_requests_bp.route('/', methods=['POST'])
@login_required
@handle_api_exceptions
def create_request():
    """Create a new access request."""
    # User can only request for themselves
    user_id = g.user['userId']
    data = request.json
    
    # role_id is required
    role_id = data.get('roleId')
    reason = data.get('reason')
    
    valid_from = data.get('valid_from') # ISO string
    valid_until = data.get('valid_until') # ISO string

    result = access_request_service.create_request(user_id, role_id, reason, valid_from, valid_until)
    return jsonify(result), 201

@access_requests_bp.route('/', methods=['GET'])
@login_required
@handle_api_exceptions
def list_requests():
    """List access requests. Admin sees all, User sees own."""
    user_id = g.user['userId']
    role = g.user.get('role')
    
    status = request.args.get('status')
    
    if role == 'Admin':
        # Admin can see all requests
        requests = access_request_service.list_requests(status=status)
    else:
        # User sees only their own
        requests = access_request_service.list_requests(user_id=user_id, status=status)
        
    return jsonify(requests)

@access_requests_bp.route('/pending-count', methods=['GET'])
@login_required
@admin_required
@handle_api_exceptions
def get_pending_count():
    """Get the count of pending access requests."""
    result = access_request_service.total_pending_count()
    return jsonify(result)

@access_requests_bp.route('/<request_id>/approve', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def approve_request(request_id):
    """Approve a request."""
    reviewer_id = g.user['userId']
    result = access_request_service.approve_request(request_id, reviewer_id)
    return jsonify(result)

@access_requests_bp.route('/<request_id>/reject', methods=['POST'])
@login_required
@admin_required
@handle_api_exceptions
def reject_request(request_id):
    """Reject a request."""
    reviewer_id = g.user['userId']
    data = request.json
    reason = data.get('reason', 'No reason provided')
    
    result = access_request_service.reject_request(request_id, reviewer_id, reason)
    return jsonify(result)

