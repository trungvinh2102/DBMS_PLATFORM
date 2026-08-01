"""Contract tests for desktop sidecar readiness identity."""

from fastapi.testclient import TestClient

from app import create_app


def make_client(monkeypatch, nonce: str | None) -> TestClient:
    if nonce is None:
        monkeypatch.delenv("QURIODB_STARTUP_NONCE", raising=False)
    else:
        monkeypatch.setenv("QURIODB_STARTUP_NONCE", nonce)
    return TestClient(create_app())


def test_general_health_endpoints_remain_unchanged(monkeypatch):
    client = make_client(monkeypatch, "launch-secret")
    assert client.get("/health").json() == {"status": "ok"}
    assert client.get("/api/health").json() == {"status": "ok"}


def test_desktop_health_is_unavailable_without_desktop_nonce(monkeypatch):
    client = make_client(monkeypatch, None)
    assert client.get("/api/desktop/health").status_code == 503


def test_desktop_health_rejects_missing_or_wrong_nonce(monkeypatch):
    client = make_client(monkeypatch, "launch-secret")
    assert client.get("/api/desktop/health").status_code == 403
    response = client.get(
        "/api/desktop/health",
        headers={"X-QurioDB-Startup-Nonce": "wrong"},
    )
    assert response.status_code == 403


def test_desktop_health_accepts_current_launch_nonce(monkeypatch):
    client = make_client(monkeypatch, "launch-secret")
    response = client.get(
        "/api/desktop/health",
        headers={"X-QurioDB-Startup-Nonce": "launch-secret"},
    )
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "quriodb-desktop"}
