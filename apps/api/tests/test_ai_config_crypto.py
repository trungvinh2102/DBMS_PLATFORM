import base64
import importlib

from cryptography.fernet import Fernet
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import routes.ai_config as ai_config
import services.ai.langchain_runtime as runtime
from models import Base, UserAIConfig


def _reload_ai_config(monkeypatch, encryption_key):
    if encryption_key is None:
        monkeypatch.delenv("ENCRYPTION_KEY", raising=False)
    else:
        monkeypatch.setenv("ENCRYPTION_KEY", encryption_key)
    return importlib.reload(ai_config)


def test_web_dev_encrypted_key_decrypts_in_desktop_without_env(monkeypatch):
    desktop = _reload_ai_config(monkeypatch, None)
    desktop_fallback = desktop.MASTER_KEY
    web = _reload_ai_config(monkeypatch, desktop_fallback)
    encrypted_key = web.cipher.encrypt(b"test-provider-key").decode()

    desktop = _reload_ai_config(monkeypatch, None)
    assert desktop.decrypt_key(encrypted_key) == "test-provider-key"


def test_fallback_and_explicit_encryption_key_resolution(monkeypatch):
    desktop = _reload_ai_config(monkeypatch, None)
    expected_fallback = base64.urlsafe_b64encode(
        desktop.AI_CONFIG_FALLBACK_SECRET.encode().ljust(32)[:32]
    ).decode()
    assert desktop.MASTER_KEY == expected_fallback

    explicit_key = Fernet.generate_key().decode()
    explicit = _reload_ai_config(monkeypatch, explicit_key)
    assert explicit.MASTER_KEY == explicit_key


def test_local_web_key_matches_desktop_fallback_and_invalid_ciphertext_returns_none(monkeypatch):
    desktop = _reload_ai_config(monkeypatch, None)
    web = _reload_ai_config(monkeypatch, desktop.MASTER_KEY)

    assert web.MASTER_KEY == desktop.MASTER_KEY
    assert desktop.decrypt_key("invalid-ciphertext") is None


def _runtime_with_sqlite(monkeypatch):
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    monkeypatch.setattr(runtime, "SessionLocal", session_factory)
    return session_factory


def test_status_reports_decrypted_persisted_google_api_key(monkeypatch):
    crypto = _reload_ai_config(monkeypatch, None)
    runtime_module = importlib.reload(runtime)
    session_factory = _runtime_with_sqlite(monkeypatch)

    session = session_factory()
    try:
        session.add(
            UserAIConfig(
                id="config-1",
                userId="user-1",
                apiKey=crypto.cipher.encrypt(b"test-provider-key").decode(),
                provider="Google",
            )
        )
        session.commit()
    finally:
        session.close()

    status = runtime_module.langchain_runtime.status("user-1")

    assert status["hasApiKey"] is True
    assert status["providers"]["google"]["hasApiKey"] is True


def test_status_reports_no_api_key_without_persisted_config(monkeypatch):
    _reload_ai_config(monkeypatch, None)
    runtime_module = importlib.reload(runtime)
    _runtime_with_sqlite(monkeypatch)

    status = runtime_module.langchain_runtime.status("user-1")

    assert status["hasApiKey"] is False
    assert status["providers"]["google"]["hasApiKey"] is False
