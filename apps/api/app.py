"""
app.py

Main FastAPI application entry point.
Initializes the app, CORS, and registers routers.
"""

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
import logging
import sys
import threading
import time
import psutil
import platform
import uvicorn

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
    os.path.join(base_path, '_up_', '_up_', 'api', '.env'),
    os.path.join(base_path, '..', '_up_', '_up_', 'api', '.env'),
    os.path.abspath('.env'),
    os.path.abspath('api.env')
]
for p in env_paths:
    if os.path.exists(p):
        print(f"Backend: Loading configuration from {p}")
        load_dotenv(dotenv_path=p, override=True)
        if not os.getenv("DATABASE_URL"):
            os.environ.pop("DATABASE_URL", None)
        break
else:
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

def setup_database():
    """Ensure the system database is ready with schema and default seeds (Zero-Setup)."""
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
    """Application factory for FastAPI."""
    app = FastAPI(title="QurioDB API", description="FastAPI Backend for QurioDB")
    
    origins = [
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
    ]

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["Authorization"]
    )

    # Run automated setup
    setup_database()

    # Register Routers
    app.include_router(connection_bp, prefix='/api/database')
    app.include_router(metadata_bp, prefix='/api/database')
    app.include_router(execution_bp, prefix='/api/database')
    app.include_router(auth_bp, prefix='/api/auth')
    app.include_router(user_bp, prefix='/api/user')
    app.include_router(ai_bp, prefix='/api/ai')
    app.include_router(ai_config_bp, prefix='/api/ai-config')
    app.include_router(dashboard_bp, prefix='/api/database/dashboard')
    app.include_router(import_bp, prefix='/api/database')

    @app.middleware("http")
    async def log_request_info(request: Request, call_next):
        print(f"API Request: {request.method} {request.url.path} (Origin: {request.headers.get('origin')})")
        response = await call_next(request)
        return response

    @app.get('/api/health')
    @app.get('/health')
    def health():
        logger.info("Health check requested")
        return {'status': 'ok'}

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        print(f"BACKEND ERROR: {str(exc)}")
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error", "message": str(exc)}
        )

    return app

def monitor_parent():
    """
    Monitors the parent process (Tauri).
    If the parent process is no longer running, exit this process.
    """
    try:
        parent_id = os.getppid()
        if parent_id <= 1:
            logging.info("Backend: Started as orphan or adopted by init. Not monitoring.")
            return

        parent = psutil.Process(parent_id)
        logging.info(f"Backend: Monitoring parent process: {parent.name()} (PID: {parent_id})")

        while True:
            if not parent.is_running():
                logging.warning("Backend: Parent process (Tauri) has exited. Shutting down...")
                os._exit(0)
            time.sleep(2)
    except Exception as e:
        logging.error(f"Backend: Error in parent monitor: {e}")

app = create_app()

if __name__ == '__main__':
    monitor_thread = threading.Thread(target=monitor_parent, daemon=True)
    monitor_thread.start()

    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '127.0.0.1')
    
    # Run using uvicorn
    uvicorn.run("app:app", host=host, port=port, reload=False)
