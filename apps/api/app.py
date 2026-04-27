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
import threading
import time
import psutil
import platform

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
env_paths = [
    os.path.join(base_path, '.env'),
    os.path.join(base_path, 'api.env'),
    os.path.join(base_path, 'resources', '.env'),
    os.path.join(base_path, 'resources', 'api.env'),
    # Tauri v2 preserves hierarchy for resources. The source is ../../api/.env
    # but in bundle it might be nested.
    os.path.join(base_path, '_up_', '_up_', 'api', '.env'),
    # Tauri extracts sidecars into bin/, but resources into the root. So we need to go up one level.
    os.path.join(base_path, '..', '_up_', '_up_', 'api', '.env'),
    # Fallback to current working directory
    os.path.abspath('.env'),
    os.path.abspath('api.env')
]
for p in env_paths:
    if os.path.exists(p):
        print(f"Backend: Loading configuration from {p}")
        load_dotenv(dotenv_path=p, override=True)
        # Verify if DATABASE_URL was actually set by this or exists
        if not os.getenv("DATABASE_URL"):
            # Purge from environment to force SQLite fallback if it was previously set in terminal
            os.environ.pop("DATABASE_URL", None)
        break
else:
    # No .env file found, purge any leftover DATABASE_URL from system env to be safe
    os.environ.pop("DATABASE_URL", None)
    load_dotenv()

from routes.connection_routes import connection_bp
from routes.metadata_routes import metadata_bp
from routes.execution_routes import execution_bp
from routes.auth import auth_bp
from routes.user import user_bp
from routes.ai import ai_bp
from routes.ai_config import ai_config_bp
from routes.dashboard_routes import dashboard_bp
from routes.import_routes import import_bp

# Explicit imports to help PyInstaller find them
import models.metadata
import services.auth_service
import passlib.handlers.bcrypt
from models.metadata import User
from services.auth_service import auth_service
import uuid

def setup_database(app):
    """Ensure the system database is ready with schema and default seeds (Zero-Setup)."""
    with app.app_context():
        from models.metadata import Base, engine, Role, User, SessionLocal
        import uuid
        
        if engine:
            try:
                print("Backend: Checking and initializing database schema...")
                Base.metadata.create_all(engine)
                
                session = SessionLocal()
                # 1. Seed Roles
                roles_data = [
                    {"name": "Admin", "description": "Full system access"},
                    {"name": "Creator", "description": "Can create and manage resources"},
                    {"name": "Viewer", "description": "Can view shared resources"},
                    {"name": "Default", "description": "Basic access"},
                ]
                for rd in roles_data:
                    if not session.query(Role).filter(Role.name == rd["name"]).first():
                        rid = "default" if rd["name"] == "Default" else str(uuid.uuid4())
                        session.add(Role(id=rid, name=rd["name"], description=rd["description"]))
                
                # 2. Seed Default Admin if no users exist
                if session.query(User).count() == 0:
                    admin_role = session.query(Role).filter(Role.name == "Admin").first()
                    if admin_role:
                        from services.auth_service import auth_service
                        hashed_pw = auth_service.get_password_hash("password123")
                        admin_user = User(
                            id=str(uuid.uuid4()),
                            email="admin@quriodb.local",
                            username="admin",
                            password=hashed_pw,
                            name="System Admin",
                            roleId=admin_role.id
                        )
                        session.add(admin_user)
                        print("Backend: Default admin user created (admin / password123)")
                
                session.commit()
                session.close()
                print("Backend: Database setup complete.")
            except Exception as e:
                print(f"Backend Error: Automated setup failed: {e}")
                if 'session' in locals():
                    session.rollback()
                    session.close()

def create_app():
    """Application factory for Flask."""
    app = Flask(__name__)
    
    # Configure CORS - Allow common development and Tauri origins
    CORS(app, resources={r"/api/*": {
        "origins": [
            "tauri://localhost", 
            "http://tauri.localhost", 
            "https://tauri.localhost",
            "http://localhost:3000", 
            "http://127.0.0.1:3000",
            "http://localhost:3001", 
            "http://127.0.0.1:3001", 
            "http://localhost:3002", 
            "http://127.0.0.1:3002",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:1420", 
            "http://127.0.0.1:1420",
            "http://localhost:1421",
            "http://127.0.0.1:1421"
        ],
        "expose_headers": ["Authorization"],
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "X-App-Platform"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }}, supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(connection_bp, url_prefix='/api/database')
    app.register_blueprint(metadata_bp, url_prefix='/api/database')
    app.register_blueprint(execution_bp, url_prefix='/api/database')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/user')
    app.register_blueprint(ai_bp, url_prefix='/api/ai')
    app.register_blueprint(ai_config_bp, url_prefix='/api/ai-config')
    app.register_blueprint(dashboard_bp, url_prefix='/api/database/dashboard')
    app.register_blueprint(import_bp, url_prefix='/api/database')

    # Run automated setup
    setup_database(app)

    @app.before_request
    def log_request_info():
        print(f"API Request: {request.method} {request.path} (Origin: {request.headers.get('Origin')})")

    @app.route('/api/health')
    @app.route('/health')
    def health():
        logger.info("Health check requested")
        return {'status': 'ok'}
        
    @app.errorhandler(404)
    def handle_404(e):
        return jsonify(error="Not Found", path=request.path), 404

    @app.errorhandler(Exception)
    def handle_exception(e):
        print(f"BACKEND ERROR: {str(e)}")
        return jsonify(error="Internal Server Error", message=str(e)), 500

    return app

def monitor_parent():
    """
    Monitors the parent process (Tauri).
    If the parent process is no longer running, exit this process.
    """
    try:
        parent_id = os.getppid()
        # On some systems, ppid 1 means adopted by init (orphan)
        if parent_id <= 1:
            logging.info("Backend: Started as orphan or adopted by init. Not monitoring.")
            return

        parent = psutil.Process(parent_id)
        logging.info(f"Backend: Monitoring parent process: {parent.name()} (PID: {parent_id})")

        while True:
            # Check if parent is still alive
            if not parent.is_running():
                logging.warning("Backend: Parent process (Tauri) has exited. Shutting down...")
                os._exit(0)
            time.sleep(2)
    except Exception as e:
        logging.error(f"Backend: Error in parent monitor: {e}")

if __name__ == '__main__':
    # Start parent monitor in a background thread
    monitor_thread = threading.Thread(target=monitor_parent, daemon=True)
    monitor_thread.start()

    # app = create_app() is now handled below with proper migration called during creation
    # The setup logic is now inside create_app() factory for robust zero-setup behavior.
    pass
            
    app = create_app()
    # Get port and host
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '127.0.0.1')
    debug = str(os.environ.get('DEBUG', 'False')).lower() == 'true'
    
    app.run(host=host, port=port, debug=debug)

