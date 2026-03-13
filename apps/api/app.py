"""
backend/app.py

Main Flask application entry point.
Initializes the app, CORS, and registers blueprints.
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv
import os

# Load environment variables BEFORE importing routes/services
import sys
# Detect if running as PyInstaller bundle
if getattr(sys, 'frozen', False):
    base_path = os.path.dirname(sys.executable)
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

# Try loading from executable dir FIRST (for production)
env_path = os.path.join(base_path, '.env')
# Also check resources folder (Tauri standard)
res_env_path = os.path.join(base_path, 'resources', '.env')

if os.path.exists(env_path):
    print(f"Backend: Detected .env at {env_path}")
    load_dotenv(dotenv_path=env_path)
elif os.path.exists(res_env_path):
    print(f"Backend: Detected .env in resources at {res_env_path}")
    load_dotenv(dotenv_path=res_env_path)
else:
    # Try current working directory as fallback
    load_dotenv()

from routes.database import database_bp
from routes.auth import auth_bp
from routes.user import user_bp
from routes.ai import ai_bp

# Explicit imports to help PyInstaller find them
import models.metadata
import services.auth_service
import passlib.handlers.bcrypt
from models.metadata import User
from services.auth_service import auth_service

def create_app():
    """Application factory for Flask."""
    app = Flask(__name__)
    
    # Configure CORS - Allow Tauri origins explicitly when supporting credentials
    CORS(app, resources={r"/api/*": {
        "origins": ["tauri://localhost", "http://tauri.localhost", "http://localhost:3001", "http://127.0.0.1:3001"]
    }}, supports_credentials=True)
    # No manual headers needed, flask-cors will handle it.

    # Register Blueprints
    app.register_blueprint(database_bp, url_prefix='/api/database')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')

    @app.before_request
    def log_request_info():
        # app.logger.debug('Headers: %s', request.headers)
        # app.logger.debug('Body: %s', request.get_data())
        if request.method != 'OPTIONS':
            print(f"API Request: {request.method} {request.path}")

    @app.route('/api/health')
    @app.route('/health')
    def health():
        """Health check endpoint."""
        return {'status': 'ok'}
        
    @app.errorhandler(404)
    def handle_404(e):
        print(f"404 Error: {request.method} {request.path}")
        return jsonify(error="Not Found", path=request.path), 404

    return app

if __name__ == '__main__':
    # Ensure database tables are created
    from models.metadata import Base, engine, SessionLocal
    if engine:
        print("Backend: Creating database tables if they don't exist...")
        Base.metadata.create_all(engine)
        
        # SEED: Create default admin if no users exist
        session = SessionLocal()
        if session.query(User).count() == 0:
            print("Backend: Seeding default admin user (admin / admin123)...")
            auth_service.register({
                "username": "admin",
                "email": "admin@example.com",
                "password": "admin123",
                "fullName": "System Admin"
            })
        session.close()
        
    app = create_app()
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    # Bind to 0.0.0.0 to ensure accessibility from within desktop apps (Electron/Tauri)
    # This helps avoid localhost/127.0.0.1/::1 resolution issues
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=debug)
