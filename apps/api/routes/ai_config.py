from flask import Blueprint, request, jsonify, g
from models.metadata import UserAIConfig, SessionLocal
from utils.auth_middleware import login_required
import uuid
from cryptography.fernet import Fernet
import os

ai_config_bp = Blueprint('ai_config', __name__)

# Master key for encryption. In production, this must be a fixed key in .env
MASTER_KEY = (os.getenv("ENCRYPTION_KEY") or "").strip() or None
if not MASTER_KEY:
    # Fallback to a generated one (not recommended for production persistence)
    MASTER_KEY = "dummy_encryption_key_for_development_only_123"
    # Fernet keys must be 32 url-safe base64-encoded bytes
    import base64
    MASTER_KEY = base64.urlsafe_b64encode(MASTER_KEY.encode().ljust(32)[:32]).decode()

cipher = Fernet(MASTER_KEY.encode())

@ai_config_bp.route('/get', methods=['GET'])
@login_required
def get_config():
    user_id = g.user.get('userId')
    reveal = request.args.get('reveal', 'false').lower() == 'true'
    session = SessionLocal()
    try:
        config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
        if not config:
            return jsonify({'apiKey': None, 'provider': 'Google'})
        
        api_key = '********'
        if reveal and config.apiKey:
            try:
                api_key = cipher.decrypt(config.apiKey.encode()).decode()
            except:
                api_key = 'decryption_error'
                
        return jsonify({
            'apiKey': api_key,
            'provider': config.provider
        })
    finally:
        session.close()

@ai_config_bp.route('/save', methods=['POST'])
@login_required
def save_config():
    user_id = g.user.get('userId')
    data = request.json
    api_key = data.get('apiKey')
    provider = data.get('provider', 'Google')
    
    if not api_key:
        return jsonify({'error': 'API Key is required'}), 400
        
    session = SessionLocal()
    try:
        # If user sent '********', it means they didn't change it, only other settings
        if api_key == '********':
            config = session.query(UserAIConfig).filter(UserAIConfig.userId == user_id).first()
            if config:
                config.provider = provider
                session.commit()
                return jsonify({'message': 'Config updated successfully'})
            return jsonify({'error': 'No existing config to update'}), 400

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
        return jsonify({'message': 'Config saved successfully'})
    except Exception as e:
        session.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        session.close()

def decrypt_key(encrypted_key):
    try:
        return cipher.decrypt(encrypted_key.encode()).decode()
    except:
        return None
