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
    os.path.join(base_path, '_up_', '_up_', 'api', '.env') # Tauri v2 preserves hierarchy for resources
]
for p in env_paths:
    if os.path.exists(p):
        print(f"Backend: Detected .env at {p}")
        load_dotenv(dotenv_path=p)
        break
else:
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
import uuid

def create_app():
    """Application factory for Flask."""
    app = Flask(__name__)
    
    # Configure CORS - Allow Tauri origins explicitly when supporting credentials
    CORS(app, resources={r"/api/*": {
        "origins": ["tauri://localhost", "http://tauri.localhost", "http://localhost:3001", "http://127.0.0.1:3001", "http://localhost:3002", "http://127.0.0.1:3002"]
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
        # Log all requests including OPTIONS to debug CORS/Network issues
        print(f"API Request: {request.method} {request.path} (Origin: {request.headers.get('Origin')})")

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

    # Ensure database tables are created and seeded
    from models.metadata import Base, engine, Role, User, SessionLocal
    if engine:
        logger.info("Backend: Creating database tables if they don't exist...")
        Base.metadata.create_all(engine)
        
        # SIMPLE MIGRATION: Check for missing columns in existing tables (SQLAlchemy create_all doesn't add columns)
        from sqlalchemy import text
        try:
            with engine.connect() as conn:
                # Check for users.avatarUrl and users.bio
                result = conn.execute(text("PRAGMA table_info(users)")).fetchall()
                columns = [r[1] for r in result]
                
                if "avatarUrl" not in columns:
                    logger.info("Backend: Migrating database - adding 'avatarUrl' to 'users' table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN avatarUrl TEXT"))
                    conn.commit()
                
                if "bio" not in columns:
                    logger.info("Backend: Migrating database - adding 'bio' to 'users' table...")
                    conn.execute(text("ALTER TABLE users ADD COLUMN bio TEXT"))
                    conn.commit()
                    
                logger.info("Backend: Schema check complete.")
        except Exception as e:
            logger.warning(f"Backend: Auto-migration check skipped or failed: {e}")
        
        # Seed initial roles if missing
        session = SessionLocal()
        try:
            for role_name in ["Default", "Admin"]:
                r = session.query(Role).filter(Role.name == role_name).first()
                if not r:
                    logger.info(f"Backend: Seeding '{role_name}' role...")
                    # Using hardcoded IDs or uuids. Hardcode default for backward compat
                    rid = "default" if role_name == "Default" else str(uuid.uuid4())
                    session.add(Role(id=rid, name=role_name))
            session.commit()
            logger.info("Backend: Roles seeded successfully.")
        except Exception as e:
            logger.error(f"Backend: Failed to seed roles: {e}", exc_info=True)
            session.rollback()
        finally:
            session.close()
        
        # SEED: Create default admin if no users exist
        session = SessionLocal()
        try:
            if session.query(User).count() == 0:
                logger.info("Backend: Seeding default admin user (admin / admin123)...")
                admin_role = session.query(Role).filter(Role.name == "Admin").first()
                if admin_role:
                    from services.auth_service import auth_service
                    hashed_pw = auth_service.get_password_hash("admin123")
                    admin_user = User(
                        id=str(uuid.uuid4()),
                        email="admin@dbms.local",
                        username="admin",
                        password=hashed_pw,
                        name="System Admin",
                        roleId=admin_role.id
                    )
                    session.add(admin_user)
                    session.commit()
        except Exception as e:
            logger.error(f"Backend: Failed to seed admin user: {e}")
        finally:
            session.close()
        
    app = create_app()
    # Get port and host
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '127.0.0.1')
    debug = str(os.environ.get('DEBUG', 'False')).lower() == 'true'
    
    app.run(host=host, port=port, debug=debug)
