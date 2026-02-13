
"""
backend/routes/auth.py
"""
from flask import Blueprint, request, jsonify
from services.auth_service import auth_service

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    try:
        # Support login by username or email
        identifier = data.get('username') or data.get('email')
        if not identifier:
            return jsonify({'error': 'Username or email is required'}), 400
        result = auth_service.login(identifier, data['password'])
        if not result:
            return jsonify({'error': 'Invalid credentials'}), 401
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    try:
        result = auth_service.register(data)
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
