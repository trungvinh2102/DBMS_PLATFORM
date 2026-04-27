"""
backend/routes/user.py
"""
from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any
from pydantic import BaseModel
from services.user_service import user_service
from utils.auth_middleware import get_current_user

user_bp = APIRouter()

class PasswordChangeRequest(BaseModel):
    oldPassword: str
    newPassword: str

@user_bp.get('/me')
def get_me(current_user: dict = Depends(get_current_user)):
    try:
        profile = user_service.get_profile(current_user['userId'])
        return profile
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@user_bp.post('/profile')
def update_profile(data: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_user)):
    try:
        res = user_service.update_profile(current_user['userId'], data)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@user_bp.post('/change-password')
def change_password(data: PasswordChangeRequest, current_user: dict = Depends(get_current_user)):
    try:
        res = user_service.change_password(current_user['userId'], data.oldPassword, data.newPassword)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@user_bp.get('/settings')
def get_settings(current_user: dict = Depends(get_current_user)):
    try:
        settings = user_service.get_settings(current_user['userId'])
        return settings
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@user_bp.post('/settings')
def update_settings(data: Dict[str, Any] = Body(...), current_user: dict = Depends(get_current_user)):
    try:
        user_service.update_settings(current_user['userId'], data)
        return {'success': True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
