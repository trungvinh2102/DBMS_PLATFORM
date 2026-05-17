"""
backend/tests/conftest.py

Fixtures and configuration for pytest.
"""

import pytest
from unittest.mock import MagicMock
from functools import wraps
from fastapi.testclient import TestClient

def mock_decorator(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated

import utils.auth_middleware
utils.auth_middleware.login_required = mock_decorator
utils.auth_middleware.admin_required = mock_decorator

from app import create_app
from utils.auth_middleware import get_current_user
import services.base_service
import services.connection
import services.execution
import services.metadata


class FastAPIResponseAdapter:
    """Compatibility wrapper for tests that access response.json as a property."""

    def __init__(self, response):
        self._response = response
        self.json = response.json()

    def __getattr__(self, name):
        return getattr(self._response, name)


class FastAPIClientAdapter:
    """Small adapter exposing compact test client calls over FastAPI TestClient."""

    def __init__(self, app):
        self._client = TestClient(app)

    def get(self, *args, **kwargs):
        return FastAPIResponseAdapter(self._client.get(*args, **kwargs))

    def post(self, *args, **kwargs):
        return FastAPIResponseAdapter(self._client.post(*args, **kwargs))

    def put(self, *args, **kwargs):
        return FastAPIResponseAdapter(self._client.put(*args, **kwargs))

    def delete(self, *args, **kwargs):
        return FastAPIResponseAdapter(self._client.delete(*args, **kwargs))


@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.dependency_overrides[get_current_user] = lambda: {
        "userId": "test-user-id",
        "email": "test@example.com",
        "role": "Admin",
        "username": "test",
    }
    yield app
    app.dependency_overrides.clear()

@pytest.fixture
def client(app):
    """A test client for the app."""
    return FastAPIClientAdapter(app)

@pytest.fixture
def mock_session(mocker):
    """
    Mock SQLAlchemy session local to prevent real DB queries.
    Passes a mock session object that can be configured in tests.
    """
    mock_session_cls = mocker.patch("services.base_service.SessionLocal")
    mock_session_inst = MagicMock()
    mock_session_cls.return_value = mock_session_inst
    # Patch modules that still own their own sessions plus the FastAPI DB dependency.
    mocker.patch("services.metadata.SessionLocal", return_value=mock_session_inst)
    mocker.patch("deps.SessionLocal", return_value=mock_session_inst)
    return mock_session_inst

@pytest.fixture
def mock_engine(mocker):
    """
    Mock SQLAlchemy create_engine to verify connection logic without connecting.
    """
    import services.base_service
    services.base_service._engine_cache.clear()
    
    mock_engine = mocker.patch("services.base_service.create_engine")
    engine_inst = MagicMock()
    mock_engine.return_value = engine_inst
    
    # Setup connection context manager and standard return
    conn = MagicMock()
    engine_inst.connect.return_value = conn
    conn.__enter__.return_value = conn
    
    # Specifically for the new execution connection options
    conn.execution_options.return_value = conn
    
    return engine_inst, conn
