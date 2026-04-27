"""
backend/utils/auth_middleware.py
Middleware for verifying JWT tokens in FastAPI.
"""
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from models.metadata import User, SessionLocal

SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

# Flag to bypass all auth/permission checks for Desktop/local mode
DISABLE_AUTH = str(os.getenv("DISABLE_AUTH", "false")).lower() == "true"

# Mock Admin user for DISABLE_AUTH mode
MOCK_ADMIN = {
    'userId': 'desktop-admin-id',
    'email': 'admin@quriodb.local',
    'role': 'Admin',
    'username': 'admin'
}

security = HTTPBearer(auto_error=False)

def get_current_user(request: Request, auth: HTTPAuthorizationCredentials = Security(security)):
    if DISABLE_AUTH:
        return MOCK_ADMIN
        
    token = None
    if auth:
        token = auth.credentials
    if not token:
        token = request.cookies.get('auth_token')
        
    if not token:
        raise HTTPException(status_code=401, detail='Token is missing')
        
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get('userId')
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token payload")
            
        session = SessionLocal()
        if not session:
            raise HTTPException(status_code=500, detail="Database connection failed")
            
        try:
            user = session.query(User).filter(User.id == user_id).first()
            if not user:
                raise HTTPException(status_code=401, detail='User no longer exists')
            return payload # {userId, email, role}
        finally:
            session.close()
            
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Token is invalid: {str(e)}')

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if DISABLE_AUTH:
        return current_user
        
    if not current_user or current_user.get('role') != 'Admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return current_user
