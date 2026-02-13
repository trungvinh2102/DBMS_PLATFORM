
"""
backend/routes/user.py
"""
from flask import Blueprint, request, jsonify, g
from services.user_service import user_service
from utils.auth_middleware import login_required, admin_required

user_bp = Blueprint('user', __name__)

@user_bp.route('/me', methods=['GET'])
@login_required
def get_me():
    try:
        profile = user_service.get_profile(g.user['userId'])
        return jsonify(profile)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/settings', methods=['GET'])
@login_required
def get_settings():
    try:
        settings = user_service.get_settings(g.user['userId'])
        return jsonify(settings)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/settings', methods=['POST'])
@login_required
def update_settings():
    data = request.json
    try:
        user_service.update_settings(g.user['userId'], data)
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
