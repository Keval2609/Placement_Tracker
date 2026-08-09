"""Tests for alert scheduler heartbeat tracking and /health/scheduler endpoint."""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi.testclient import TestClient

from app.main import app
from app.services import alert_service

client = TestClient(app)


def test_scheduler_health_fresh_heartbeat() -> None:
    """Verify /health/scheduler returns 200 OK when heartbeat is fresh."""
    alert_service.record_scheduler_heartbeat()
    response = client.get("/health/scheduler")
    assert response.status_code == 200
    data: dict[str, Any] = response.json()
    assert data["status"] == "healthy"
    assert "last_heartbeat_iso" in data
    assert data["seconds_since_last_heartbeat"] >= 0


def test_scheduler_health_stale_heartbeat() -> None:
    """Verify /health/scheduler returns 503 Service Unavailable when heartbeat is stale (>15m)."""
    stale_time = datetime.now(UTC) - timedelta(minutes=20)
    alert_service._last_scheduler_heartbeat = stale_time
    response = client.get("/health/scheduler")
    assert response.status_code == 503
    data: dict[str, Any] = response.json()
    assert data["detail"]["status"] == "stale"
    assert data["detail"]["seconds_since_last_heartbeat"] >= 1200


def test_scheduler_health_no_heartbeat() -> None:
    """Verify /health/scheduler returns 503 when heartbeat has never been recorded."""
    alert_service._last_scheduler_heartbeat = None
    response = client.get("/health/scheduler")
    assert response.status_code == 503
    data: dict[str, Any] = response.json()
    assert data["detail"]["status"] == "stale"
    assert data["detail"]["seconds_since_last_heartbeat"] is None
