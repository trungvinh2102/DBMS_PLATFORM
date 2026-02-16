from flask import Blueprint, request, jsonify, g
from services.notification_service import notification_service
from utils.db_utils import handle_api_exceptions
from utils.auth_middleware import login_required

notification_bp = Blueprint('notification', __name__)

@notification_bp.route('/', methods=['GET'])
@login_required
@handle_api_exceptions
def get_notifications():
    """Get all notifications for the current user."""
    user_id = g.user.get('userId')
    limit = request.args.get('limit', default=20, type=int)
    offset = request.args.get('offset', default=0, type=int)
    notifications = notification_service.get_notifications(user_id, limit, offset)
    return jsonify(notifications)

@notification_bp.route('/unread-count', methods=['GET'])
@login_required
@handle_api_exceptions
def get_unread_count():
    """Get count of unread notifications."""
    user_id = g.user.get('userId')
    count = notification_service.get_unread_count(user_id)
    return jsonify({'count': count})

@notification_bp.route('/<string:notification_id>/read', methods=['PUT'])
@login_required
@handle_api_exceptions
def mark_as_read(notification_id):
    """Mark a notification as read."""
    user_id = g.user.get('userId')
    success = notification_service.mark_as_read(notification_id, user_id)
    return jsonify({'success': success})

@notification_bp.route('/read-all', methods=['PUT'])
@login_required
@handle_api_exceptions
def mark_all_as_read():
    """Mark all notifications as read."""
    user_id = g.user.get('userId')
    success = notification_service.mark_all_as_read(user_id)
    return jsonify({'success': success})
