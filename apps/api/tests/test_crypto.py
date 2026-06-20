"""
backend/tests/test_crypto.py

Regression tests for symmetric crypto used to protect connection secrets.

The packaged desktop sidecar runs as a frozen PyInstaller binary that does not
load apps/api/.env, so JWT_SECRET is unset and get_secret() falls back to its
default. That default MUST match the value used when the secrets were encrypted
(apps/api/.env -> supersecret123, also the frontend default in
apps/web/src/lib/crypto.ts), or every stored URI/password decrypts to garbage
and connections fail with "Could not parse SQLAlchemy URL".
"""

import importlib

import pytest

import utils.crypto as crypto


def _reload_without_jwt_secret(monkeypatch):
    monkeypatch.delenv("JWT_SECRET", raising=False)
    return importlib.reload(crypto)


def test_default_secret_matches_frontend_and_env(monkeypatch):
    """Frozen sidecar fallback must equal the secret data was encrypted with."""
    mod = _reload_without_jwt_secret(monkeypatch)
    assert mod.get_secret() == "supersecret123"


def test_roundtrip_without_jwt_secret(monkeypatch):
    """encrypt/decrypt must round-trip when JWT_SECRET is unset (desktop case)."""
    mod = _reload_without_jwt_secret(monkeypatch)
    uri = "postgresql+psycopg2://u:p@127.0.0.1:5432/jobmate"
    assert mod.decrypt(mod.encrypt(uri)) == uri


def test_env_encrypted_value_decrypts_with_default(monkeypatch):
    """A value encrypted under JWT_SECRET=supersecret123 (web/.env run) must
    decrypt in a sidecar run where JWT_SECRET is absent."""
    monkeypatch.setenv("JWT_SECRET", "supersecret123")
    mod = importlib.reload(crypto)
    token = mod.encrypt("s3cr3t-password")

    mod = _reload_without_jwt_secret(monkeypatch)
    assert mod.decrypt(token) == "s3cr3t-password"


def test_explicit_secret_overrides_default(monkeypatch):
    mod = _reload_without_jwt_secret(monkeypatch)
    assert mod.get_secret("explicit") == "explicit"
