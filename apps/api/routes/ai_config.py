from fastapi import APIRouter, Depends, HTTPException, Query, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
from models.metadata import UserAIConfig, SessionLocal
from utils.auth_middleware import get_current_user
import uuid
from cryptography.fernet import Fernet
import os

ai_config_bp = APIRouter(dependencies=[Depends(get_current_user)])

MASTER_KEY = (os.getenv("ENCRYPTION_KEY") or "").strip() or None
if not MASTER_KEY:
    MASTER_KEY = "dummy_encryption_key_for_development_only_123"
    import base64
    MASTER_KEY = base64.urlsafe_b64encode(MASTER_KEY.encode().ljust(32)[:32]).decode()

cipher = Fernet(MASTER_KEY.encode())

class SaveConfigRequest(BaseModel):
    apiKey: str
    provider: str = "Google"

@ai_config_bp.get('/get')
def get_config(reveal: bool = False, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    session = SessionLocal()
    try:
        config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
        if not config:
            return {'apiKey': None, 'provider': 'Google'}
        
        api_key = '********'
        if reveal and config.apiKey:
            try:
                api_key = cipher.decrypt(config.apiKey.encode()).decode()
            except:
                api_key = 'decryption_error'
                
        return {
            'apiKey': api_key,
            'provider': config.provider
        }
    finally:
        session.close()

@ai_config_bp.post('/save')
def save_config(data: SaveConfigRequest, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get('userId')
    api_key = data.apiKey
    provider = data.provider
    
    if not api_key:
        raise HTTPException(status_code=400, detail='API Key is required')
        
    session = SessionLocal()
    try:
        if api_key == '********':
            config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
            if config:
                config.provider = provider
                session.commit()
                return {'message': 'Config updated successfully'}
            raise HTTPException(status_code=400, detail='No existing config to update')

        encrypted_key = cipher.encrypt(api_key.encode()).decode()
        
        config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
        if config:
            config.apiKey = encrypted_key
            config.provider = provider
        else:
            config = UserAIConfig(
                id=str(uuid.uuid4()),
                userId=user_id,
                apiKey=encrypted_key,
                provider=provider
            )
            session.add(config)
        session.commit()
        return {'message': 'Config saved successfully'}
    except HTTPException:
        session.rollback()
        raise
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        session.close()

def decrypt_key(encrypted_key):
    try:
        return cipher.decrypt(encrypted_key.encode()).decode()
    except:
        return None
