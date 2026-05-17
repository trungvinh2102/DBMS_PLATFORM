"""
app.py

Thin FastAPI entry point for QurioDB.
"""

import logging
import os
import threading

import uvicorn
from fastapi import FastAPI

from core.environment import load_backend_environment

load_backend_environment()

from core.cors import configure_cors
from core.handlers import register_handlers
from core.responses import UnicodeJSONResponse
from core.routers import register_routers
from core.runtime import monitor_parent
from services.startup import setup_database

# Explicit imports help PyInstaller discover runtime dependencies.
import models
import passlib.handlers.bcrypt
import services.auth_service

logging.basicConfig(level=logging.INFO)


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="QurioDB API",
        description="Next-generation SQL/NoSQL Analytics Platform",
        version="2.0.0",
        default_response_class=UnicodeJSONResponse,
    )

    configure_cors(app)
    setup_database()
    register_routers(app)
    register_handlers(app)

    return app


app = create_app()


if __name__ == "__main__":
    monitor_thread = threading.Thread(target=monitor_parent, daemon=True)
    monitor_thread.start()

    port = int(os.environ.get("PORT", 5000))
    host = os.environ.get("HOST", "127.0.0.1")
    uvicorn.run("app:app", host=host, port=port, reload=False)
