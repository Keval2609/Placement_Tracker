"""Smoke test for the /health endpoint."""

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_root() -> None:
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["message"] == "Placement Tracker API is running"


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_health_endpoints_do_not_leak_secrets() -> None:
    """Verify health endpoints do not leak keys, tokens, or sensitive config."""
    for path in ["/health", "/health/scheduler"]:
        response = client.get(path)
        content_str = response.text.lower()
        forbidden_keywords = [
            "groq_api_key",
            "gemini_api_key",
            "service_role",
            "telegram_bot_token",
            "vapid_private_key",
            "postgres://",
            "bearer ",
        ]
        for kw in forbidden_keywords:
            assert kw not in content_str, f"Found sensitive string '{kw}' in {path} response"

