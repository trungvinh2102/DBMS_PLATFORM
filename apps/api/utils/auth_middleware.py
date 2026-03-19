
"""
backend/utils/auth_middleware.py
Middleware for verifying JWT tokens.
"""
from functools import wraps
from flask import request, jsonify, g
import jwt
import os
from models.metadata import User, SessionLocal

SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        token = None
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            if auth_header.startswith("Bearer "):
                token = auth_header.split(" ")[1]
        
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get('userId')
            if not user_id:
                raise Exception("Invalid token payload")
                
            # Verify user exists in database
            session = SessionLocal()
            try:
                user = session.query(User).filter(User.id == user_id).first()
                if not user:
                    return jsonify({'message': 'User no longer exists'}), 401
                g.user = payload # {userId, email, role}
            finally:
                session.close()
                
        except Exception as e:
            return jsonify({'message': f'Token is invalid: {str(e)}'}), 401
        
        return f(*args, **kwargs)
    return decorated

def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if request.method == 'OPTIONS':
            return f(*args, **kwargs)
            
        if not g.user or g.user.get('role') != 'Admin':
            return jsonify({'message': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated
