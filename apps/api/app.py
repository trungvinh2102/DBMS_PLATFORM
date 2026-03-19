"""
app.py

Main Flask application entry point.
Initializes the app, CORS, and registers blueprints.
"""

from flask import Flask, request, jsonify, g
from flask_cors import CORS
from dotenv import load_dotenv
import os
import logging
import sys

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables BEFORE importing routes/services
# Detect if running as PyInstaller bundle
if getattr(sys, 'frozen', False):
    base_path = os.path.dirname(sys.executable)
else:
    base_path = os.path.dirname(os.path.abspath(__file__))

# Try loading from executable dir FIRST (for production)
env_path = os.path.join(base_path, '.env')
api_env_path = os.path.join(base_path, 'api.env')
# Also check resources folder (Tauri standard)
res_env_path = os.path.join(base_path, 'resources', '.env')
res_api_env_path = os.path.join(base_path, 'resources', 'api.env')

if os.path.exists(env_path):
    print(f"Backend: Detected .env at {env_path}")
    load_dotenv(dotenv_path=env_path)
elif os.path.exists(api_env_path):
    print(f"Backend: Detected api.env at {api_env_path}")
    load_dotenv(dotenv_path=api_env_path)
elif os.path.exists(res_env_path):
    print(f"Backend: Detected .env in resources at {res_env_path}")
    load_dotenv(dotenv_path=res_env_path)
elif os.path.exists(res_api_env_path):
    print(f"Backend: Detected api.env in resources at {res_api_env_path}")
    load_dotenv(dotenv_path=res_api_env_path)
else:
    # Try current working directory as fallback
    load_dotenv()

from routes.connection_routes import connection_bp
from routes.metadata_routes import metadata_bp
from routes.execution_routes import execution_bp
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

    # Register Blueprints (Granular Database Routes)
    app.register_blueprint(connection_bp, url_prefix='/api/database')
    app.register_blueprint(metadata_bp, url_prefix='/api/database')
    app.register_blueprint(execution_bp, url_prefix='/api/database')
    
    # Other Blueprints
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
        return jsonify(error="Not Found", path=request.path), 404

    @app.errorhandler(Exception)
    def handle_exception(e):
        """Global exception handler for unhandled server errors."""
        app.logger.error(f"Unhandled Exception: {e}", exc_info=True)
        return jsonify(error="Internal Server Error", message=str(e)), 500

    return app

if __name__ == '__main__':
    # Ensure database tables are created and seeded
    from models.metadata import Base, engine, Role, User, SessionLocal
    if engine:
        logger.info("Backend: Creating database tables if they don't exist...")
        Base.metadata.create_all(engine)
        
        # Seed initial roles if missing
        session = SessionLocal()
        try:
            if not session.query(Role).filter(Role.name == "Default").first():
                logger.info("Backend: Seeding initial 'Default' role...")
                session.add(Role(id="default", name="Default"))
                session.commit()
                logger.info("Backend: 'Default' role seeded successfully.")
            else:
                logger.info("Backend: 'Default' role already exists.")
        except Exception as e:
            logger.error(f"Backend: Failed to seed roles: {e}", exc_info=True)
            session.rollback() # Rollback in case of error
        finally:
            session.close()
        
        # SEED: Create default admin if no users exist
        session = SessionLocal()
        try:
            if session.query(User).count() == 0:
                logger.info("Backend: Seeding default admin user (admin / admin123)...")
                from services.auth_service import auth_service
                auth_service.register({
                    "username": "admin",
                    "email": "admin@example.com",
                    "password": "admin123",
                    "name": "System Admin"
                })
        except Exception as e:
            logger.error(f"Backend: Failed to seed admin user: {e}")
        finally:
            session.close()
        
    app = create_app()
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    # Bind to 0.0.0.0 to ensure accessibility from within desktop apps (Electron/Tauri)
    # This helps avoid localhost/127.0.0.1/::1 resolution issues
    port = int(os.getenv('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=debug)
