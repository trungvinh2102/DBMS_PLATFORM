"""
auth.py

Authentication endpoints for login and registration.
"""

from flask import Blueprint, request, jsonify
from services.auth_service import auth_service
from utils.db_utils import handle_api_exceptions

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
@handle_api_exceptions
def login():
    """Handle user login."""
    data = request.json
    # Support login by username or email
    identifier = data.get('username') or data.get('email')
    if not identifier:
        return jsonify({'error': 'Username or email is required'}), 400
    
    result = auth_service.login(identifier, data['password'])
    if not result:
        return jsonify({'error': 'Invalid credentials'}), 401
    return jsonify(result)

@auth_bp.route('/register', methods=['POST'])
@handle_api_exceptions
def register():
    """Handle user registration."""
    data = request.json
    result = auth_service.register(data)
    return jsonify(result)
