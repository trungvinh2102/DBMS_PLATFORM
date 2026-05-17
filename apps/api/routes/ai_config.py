from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from pydantic import BaseModel
from models import SessionLocal, UserAIConfig
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


def _provider_matches(config_provider: str, requested_provider: str) -> bool:
    aliases = {
        "google gemini": "google",
        "open ai": "openai",
        "claude": "anthropic",
        "anthropic": "anthropic",
        "alibaba qwen": "qwen",
    }
    config_value = (config_provider or "Google").strip().lower()
    requested_value = (requested_provider or "Google").strip().lower()
    return aliases.get(config_value, config_value) == aliases.get(requested_value, requested_value)


def _find_config(session, user_id: str, provider: str):
    configs = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).all()
    return next((config for config in configs if _provider_matches(config.provider, provider)), None)


@ai_config_bp.get('/get')
def get_config(
    reveal: bool = False,
    provider: Optional[str] = Query(default=None),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user.get('userId')
    requested_provider = provider or 'Google'
    session = SessionLocal()
    try:
        config = _find_config(session, user_id, requested_provider) if provider else (
            session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
        )
        if not config:
            return {'apiKey': None, 'provider': requested_provider}
        
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
    provider = (data.provider or "Google").strip()
    
    if not api_key:
        raise HTTPException(status_code=400, detail='API Key is required')
        
    session = SessionLocal()
    try:
        if api_key == '********':
            config = _find_config(session, user_id, provider)
            if config:
                session.commit()
                return {'message': 'Config updated successfully'}
            raise HTTPException(status_code=400, detail='No existing config to update')

        encrypted_key = cipher.encrypt(api_key.encode()).decode()
        
        config = _find_config(session, user_id, provider)
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
