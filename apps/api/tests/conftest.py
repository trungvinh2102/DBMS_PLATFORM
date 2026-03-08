"""
backend/tests/conftest.py

Fixtures and configuration for pytest.
"""

import pytest
from unittest.mock import MagicMock
from functools import wraps

# Mock auth middleware decorators before application imports so tests bypass auth
def mock_decorator(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        return f(*args, **kwargs)
    return decorated

import utils.auth_middleware
utils.auth_middleware.login_required = mock_decorator
utils.auth_middleware.admin_required = mock_decorator

from app import create_app
import services.base_service
import services.connection
import services.execution
import services.metadata

@pytest.fixture
def app():
    """Create and configure a new app instance for each test."""
    app = create_app()
    app.config.update({
        "TESTING": True,
    })
    yield app

@pytest.fixture
def client(app):
    """A test client for the app."""
    return app.test_client()

@pytest.fixture
def mock_session(mocker):
    """
    Mock SQLAlchemy session local to prevent real DB queries.
    Passes a mock session object that can be configured in tests.
    """
    mock_session_cls = mocker.patch("services.base_service.SessionLocal")
    mock_session_inst = MagicMock()
    mock_session_cls.return_value = mock_session_inst
    # Also patch it in other service files where imported
    mocker.patch("services.connection.SessionLocal", return_value=mock_session_inst)
    mocker.patch("services.execution.SessionLocal", return_value=mock_session_inst)
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
