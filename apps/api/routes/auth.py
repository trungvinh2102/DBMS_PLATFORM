
"""
backend/routes/auth.py
"""
from flask import Blueprint, request, jsonify, make_response
from services.auth_service import auth_service
import os

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    try:
        identifier = data.get('username') or data.get('email')
        if not identifier:
            return jsonify({'error': 'Username or email is required'}), 400
        result = auth_service.login(identifier, data['password'])
        if not result:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        token = result['token']
        
        # Check if request is from a standalone app (Tauri/Mobile) or dev environment
        origin = request.headers.get('Origin', '')
        platform = request.headers.get('X-App-Platform', '')
        
        # Standalone if: custom header present, origin is tauri/app, OR it's local development
        is_standalone = (
            platform == 'tauri' or 
            'tauri' in origin or 
            'app' in origin or 
            'localhost' in origin or 
            '127.0.0.1' in origin
        )
        
        # Only remove token from body for standard web browsers to maintain security
        # If it's a web browser but NOT on localhost, we keep it secure with cookies only
        if not is_standalone:
            result.pop('token')
            
        response = make_response(jsonify(result))
        
        # Determine secure flag based on environment
        is_prod = os.getenv("FLASK_ENV") == "production"
        
        response.set_cookie(
            'auth_token',
            token,
            httponly=True,
            secure=is_prod,
            samesite='Lax' if not is_prod else 'Strict',
            max_age=60 * 60 * 24 * 7 # 7 days
        )
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    try:
        result = auth_service.register(data)
        token = result['token']
        
        origin = request.headers.get('Origin', '')
        platform = request.headers.get('X-App-Platform', '')
        
        is_standalone = (
            platform == 'tauri' or 
            'tauri' in origin or 
            'app' in origin or 
            'localhost' in origin or 
            '127.0.0.1' in origin
        )
        
        if not is_standalone:
            result.pop('token')
            
        response = make_response(jsonify(result))
        
        is_prod = os.getenv("FLASK_ENV") == "production"
        response.set_cookie(
            'auth_token',
            token,
            httponly=True,
            secure=is_prod,
            samesite='Lax' if not is_prod else 'Strict',
            max_age=60 * 60 * 24 * 7 # 7 days
        )
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/logout', methods=['POST'])
def logout():
    response = make_response(jsonify({'message': 'Logged out'}))
    response.set_cookie('auth_token', '', expires=0)
    return response
