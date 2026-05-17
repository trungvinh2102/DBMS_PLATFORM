"""
handlers.py

FastAPI request logging, health checks, and global exception handling.
"""

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


def register_handlers(app: FastAPI) -> None:
    """Register lightweight middleware, health endpoints, and error handlers."""

    @app.middleware("http")
    async def log_request_info(request: Request, call_next):
        logger.info(
            "API Request: %s %s (Origin: %s)",
            request.method,
            request.url.path,
            request.headers.get("origin"),
        )
        return await call_next(request)

    @app.get("/api/health")
    @app.get("/health")
    def health():
        logger.info("Health check requested")
        return {"status": "ok"}

    @app.exception_handler(Exception)
    async def global_exception_handler(request: Request, exc: Exception):
        logger.exception("Unhandled backend error on %s %s", request.method, request.url.path)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal Server Error", "message": "An unexpected error occurred."},
        )
