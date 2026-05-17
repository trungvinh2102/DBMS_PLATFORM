"""
http_errors.py

Shared FastAPI error helpers for route modules.
"""

from fastapi import HTTPException


def raise_http_error(exc: Exception, allow_not_found: bool = True) -> None:
    """Raises a route-safe HTTPException from a service exception."""
    status_code = 500
    if allow_not_found and "not found" in str(exc).lower():
        status_code = 404
    raise HTTPException(status_code=status_code, detail=str(exc))
