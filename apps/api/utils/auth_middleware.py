"""
backend/utils/auth_middleware.py
Middleware for verifying JWT tokens in FastAPI.
"""
from fastapi import Request, HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import os
from sqlalchemy.orm import Session

from deps import get_db
from models import User

SECRET_KEY = os.getenv("JWT_SECRET", "secret")
ALGORITHM = "HS256"

# Flag to bypass all auth/permission checks for Desktop/local mode
DISABLE_AUTH = str(os.getenv("DISABLE_AUTH", "false")).lower() == "true"

# Fallback identity for DISABLE_AUTH mode when the metadata DB has no users yet.
MOCK_ADMIN = {
    'userId': 'desktop-admin-id',
    'email': 'admin@quriodb.local',
    'role': 'Admin',
    'username': 'admin'
}


def resolve_desktop_admin(db: Session) -> dict:
    """Return the real seeded admin identity for single-user desktop mode.

    DISABLE_AUTH must bind to the same userId that owns persisted rows (AI keys,
    connections). Using a fictional id desyncs data written under DISABLE_AUTH
    from data written via real JWT auth, so prefer the actual admin/first user
    in the DB and only fall back to MOCK_ADMIN before the seed runs.
    """
    user = (
        db.query(User).filter(User.username == "admin").first()
        or db.query(User).order_by(User.created_on.asc()).first()
    )
    if not user:
        return MOCK_ADMIN
    return {
        'userId': user.id,
        'email': user.email,
        'role': MOCK_ADMIN['role'],
        'username': user.username,
    }


security = HTTPBearer(auto_error=False)

def get_current_user(
    request: Request,
    db: Session = Depends(get_db),
    auth: HTTPAuthorizationCredentials = Security(security),
):
    if DISABLE_AUTH:
        return resolve_desktop_admin(db)

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
            
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=401, detail='User no longer exists')
        return payload # {userId, email, role}
            
    except Exception as e:
        raise HTTPException(status_code=401, detail=f'Token is invalid: {str(e)}')

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if DISABLE_AUTH:
        return current_user
        
    if not current_user or current_user.get('role') != 'Admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return current_user
