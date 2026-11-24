"""Cross-tenant isolation tests: verify user A cannot access user B's drives."""

import pytest
from fastapi.testclient import TestClient

from app.dependencies import get_current_user_id
from app.main import app
from app.services.drive_service import clear_in_memory_db

client = TestClient(app)

USER_A = "user-aaa-aaa-aaa"
USER_B = "user-bbb-bbb-bbb"


@pytest.fixture(autouse=True)
def reset_db() -> None:
    clear_in_memory_db()


def _override_user(user_id: str):
    """Swap the auth dependency to impersonate a specific user."""
    async def _mock() -> str:
        return user_id
    app.dependency_overrides[get_current_user_id] = _mock


def _create_drive_as(user_id: str, company: str = "Acme Corp") -> str:
    _override_user(user_id)
    payload = {
        "company_name": company,
        "role_title": "Engineer",
        "dates": [{
            "date_type": "application_deadline",
            "label": "Deadline",
            "date_iso": "2026-12-31T23:59:59+05:30",
            "source": "user_added",
            "confirmed_by_user": True,
            "is_primary_deadline": True,
        }],
    }
    resp = client.post("/drives", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


# ---- GET /drives/{id} ----

def test_owner_can_read_own_drive() -> None:
    drive_id = _create_drive_as(USER_A)
    _override_user(USER_A)
    resp = client.get(f"/drives/{drive_id}")
    assert resp.status_code == 200


def test_other_user_cannot_read_drive() -> None:
    drive_id = _create_drive_as(USER_A)
    _override_user(USER_B)
    resp = client.get(f"/drives/{drive_id}")
    assert resp.status_code in (403, 404)


# ---- PATCH /drives/{id} ----

def test_other_user_cannot_update_drive() -> None:
    drive_id = _create_drive_as(USER_A)
    _override_user(USER_B)
    resp = client.patch(f"/drives/{drive_id}", json={"ctc_display": "50 LPA"})
    assert resp.status_code in (403, 404)


# ---- GET /drives/{id}/timeline ----

def test_other_user_cannot_read_timeline() -> None:
    drive_id = _create_drive_as(USER_A)
    _override_user(USER_B)
    resp = client.get(f"/drives/{drive_id}/timeline")
    assert resp.status_code in (403, 404)


# ---- GET /drives/{id}/documents ----

def test_other_user_cannot_read_documents() -> None:
    drive_id = _create_drive_as(USER_A)
    _override_user(USER_B)
    resp = client.get(f"/drives/{drive_id}/documents")
    assert resp.status_code in (403, 404)


# ---- PATCH /applications/{id} ----

def test_other_user_cannot_update_application_status() -> None:
    _ = _create_drive_as(USER_A)
    _override_user(USER_A)
    dash = client.get("/drives")
    app_id = dash.json()["drives"][0]["application_id"]

    _override_user(USER_B)
    resp = client.patch(f"/applications/{app_id}", json={"status": "applied"})
    assert resp.status_code in (403, 404)


# ---- GET /drives (dashboard list) ----

def test_dashboard_only_returns_own_drives() -> None:
    _create_drive_as(USER_A, "Google")
    _create_drive_as(USER_B, "Microsoft")

    _override_user(USER_A)
    resp = client.get("/drives")
    names = [d["company_name"] for d in resp.json()["drives"]]
    assert "Google" in names
    assert "Microsoft" not in names
