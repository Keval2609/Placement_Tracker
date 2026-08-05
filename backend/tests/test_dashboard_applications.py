"""Automated tests for Dashboard Drives list and Application Status updates (PRD 1.3.5)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.drive_service import clear_in_memory_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear test database state before each test."""
    clear_in_memory_db()


def create_drive(company_name: str, deadline_iso: str) -> str:
    """Helper to create a drive with a given company name and deadline ISO string."""
    payload = {
        "company_name": company_name,
        "role_title": "Software Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Deadline",
                "date_iso": deadline_iso,
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            }
        ],
    }
    resp = client.post("/drives", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_get_dashboard_drives_sorting_and_overdue() -> None:
    """Test GET /drives returns active drives sorted nearest deadline first, overdue at bottom."""
    # Future deadline 1: 10 days out
    d1 = create_drive("Google", "2026-08-15T23:59:59+05:30")
    # Future deadline 2: 2 days out (nearest active)
    d2 = create_drive("Microsoft", "2026-08-07T23:59:59+05:30")
    # Past deadline: overdue
    d3 = create_drive("Infosys", "2026-01-01T23:59:59+05:30")

    resp = client.get("/drives")
    assert resp.status_code == 200
    drives = resp.json()["drives"]

    assert len(drives) == 3

    # Active drives first sorted nearest deadline
    assert drives[0]["id"] == d2
    assert drives[0]["company_name"] == "Microsoft"
    assert drives[0]["is_overdue"] is False

    assert drives[1]["id"] == d1
    assert drives[1]["company_name"] == "Google"
    assert drives[1]["is_overdue"] is False

    # Overdue drive last
    assert drives[2]["id"] == d3
    assert drives[2]["company_name"] == "Infosys"
    assert drives[2]["is_overdue"] is True


def test_patch_application_status_applied_at_set_once() -> None:
    """Acceptance Criteria: Changing status sets applied_at once & leaves it untouched."""
    create_drive("Uber", "2026-08-10T23:59:59+05:30")

    # Get application_id from dashboard drive card
    dash_resp = client.get("/drives")
    assert dash_resp.status_code == 200
    card = dash_resp.json()["drives"][0]
    app_id = card["application_id"]
    assert card["application_status"] == "not_applied"
    assert card["applied_at"] is None

    # 1. Update status to 'applied' -> applied_at should be set
    patch1 = client.patch(f"/applications/{app_id}", json={"status": "applied"})
    assert patch1.status_code == 200
    res1 = patch1.json()
    assert res1["status"] == "applied"
    first_applied_at = res1["applied_at"]
    assert first_applied_at is not None

    # 2. Subsequent status change to 'interview' -> applied_at MUST remain identical
    patch2 = client.patch(f"/applications/{app_id}", json={"status": "interview"})
    assert patch2.status_code == 200
    res2 = patch2.json()
    assert res2["status"] == "interview"
    assert res2["applied_at"] == first_applied_at

    # 3. Rollback status to 'not_applied' (unrestricted transition) -> applied_at remains intact
    patch3 = client.patch(f"/applications/{app_id}", json={"status": "not_applied"})
    assert patch3.status_code == 200
    res3 = patch3.json()
    assert res3["status"] == "not_applied"
    assert res3["applied_at"] == first_applied_at
