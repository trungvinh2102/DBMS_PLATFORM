"""
backend/routes/auth.py
"""
from fastapi import APIRouter, Request, Response, HTTPException
from typing import Dict, Any
from pydantic import BaseModel
from services.auth_service import auth_service
import os

auth_bp = APIRouter()

class LoginRequest(BaseModel):
    username: str = None
    email: str = None
    password: str

class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    name: str = None

@auth_bp.post('/login')
def login(request: Request, response: Response, data: LoginRequest):
    try:
        identifier = data.username or data.email
        if not identifier:
            raise HTTPException(status_code=400, detail='Username or email is required')
            
        result = auth_service.login(identifier, data.password)
        if not result:
            raise HTTPException(status_code=401, detail='Invalid credentials')
        
        token = result['token']
        
        origin = request.headers.get('origin', '')
        platform = request.headers.get('x-app-platform', '')
        
        is_standalone = (
            platform == 'tauri' or 
            'tauri' in origin or 
            'app' in origin or 
            'localhost' in origin or 
            '127.0.0.1' in origin
        )
        
        if not is_standalone:
            result.pop('token')
            
        is_prod = os.getenv("FLASK_ENV") == "production"
        
        response.set_cookie(
            key='auth_token',
            value=token,
            httponly=True,
            secure=is_prod,
            samesite='lax' if not is_prod else 'strict',
            max_age=60 * 60 * 24 * 7 # 7 days
        )
        return result
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@auth_bp.post('/register')
def register(request: Request, response: Response, data: RegisterRequest):
    try:
        result = auth_service.register(data.model_dump(exclude_none=True))
        token = result['token']
        
        origin = request.headers.get('origin', '')
        platform = request.headers.get('x-app-platform', '')
        
        is_standalone = (
            platform == 'tauri' or 
            'tauri' in origin or 
            'app' in origin or 
            'localhost' in origin or 
            '127.0.0.1' in origin
        )
        
        if not is_standalone:
            result.pop('token')
            
        is_prod = os.getenv("FLASK_ENV") == "production"
        
        response.set_cookie(
            key='auth_token',
            value=token,
            httponly=True,
            secure=is_prod,
            samesite='lax' if not is_prod else 'strict',
            max_age=60 * 60 * 24 * 7 # 7 days
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@auth_bp.post('/logout')
def logout(response: Response):
    response.delete_cookie('auth_token')
    return {'message': 'Logged out'}
