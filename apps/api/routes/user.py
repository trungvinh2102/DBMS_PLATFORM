
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

@user_bp.route('/profile', methods=['POST'])
@login_required
def update_profile():
    data = request.json
    try:
        res = user_service.update_profile(g.user['userId'], data)
        return jsonify(res)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@user_bp.route('/change-password', methods=['POST'])
@login_required
def change_password():
    data = request.json
    try:
        old_password = data.get('oldPassword')
        new_password = data.get('newPassword')
        if not old_password or not new_password:
            return jsonify({'error': 'Old and new passwords are required'}), 400
            
        res = user_service.change_password(g.user['userId'], old_password, new_password)
        return jsonify(res)
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
