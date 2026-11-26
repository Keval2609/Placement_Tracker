"""Automated unit & integration tests for POST /drives confirmed-save endpoint."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.company_classifier import classify_company
from app.services.drive_service import clear_in_memory_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Reset in-memory test database before each test run."""
    clear_in_memory_db()


# ---------------------------------------------------------------------------
# 1. Company Classification Unit Tests
# ---------------------------------------------------------------------------

def test_company_classification_seed_list() -> None:
    assert classify_company("TCS") == "service"
    assert classify_company("Tata Consultancy Services") == "service"
    assert classify_company("Infosys") == "service"
    assert classify_company("Swiggy") == "startup"
    assert classify_company("Zomato") == "startup"
    assert classify_company("Google") == "product"
    assert classify_company("ISRO") == "psu"


# ---------------------------------------------------------------------------
# 2. Server-side Deadline Enforcement Tests (HTTP 422)
# ---------------------------------------------------------------------------

def test_reject_drive_without_dates() -> None:
    """Drive payload without dates is rejected (422)."""
    payload = {
        "company_name": "Acme Corp",
        "role_title": "Software Engineer",
        "dates": [],
    }
    response = client.post("/drives", json=payload)
    assert response.status_code == 422
    assert "At least one application_deadline entry must be confirmed by the user" in response.text


def test_reject_drive_with_unconfirmed_deadline() -> None:
    """Drive payload with an unconfirmed application_deadline is rejected (422)."""
    payload = {
        "company_name": "Acme Corp",
        "role_title": "Software Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Apply Deadline",
                "date_iso": "2026-08-15T23:59:59+05:30",
                "date_raw": "Apply by 15th Aug",
                "source": "ai_suggested",
                "confirmed_by_user": False,
            }
        ],
    }
    response = client.post("/drives", json=payload)
    assert response.status_code == 422
    assert "At least one application_deadline entry must be confirmed by the user" in response.text


def test_reject_drive_with_other_confirmed_date_type_only() -> None:
    """Drive payload with confirmed OA date but no confirmed deadline is rejected (422)."""
    payload = {
        "company_name": "Acme Corp",
        "role_title": "Software Engineer",
        "dates": [
            {
                "date_type": "oa",
                "label": "Online Assessment",
                "date_iso": "2026-08-15T10:00:00+05:30",
                "source": "user_added",
                "confirmed_by_user": True,
            }
        ],
    }
    response = client.post("/drives", json=payload)
    assert response.status_code == 422


# ---------------------------------------------------------------------------
# 3. Successful Drive Creation Tests (HTTP 201)
# ---------------------------------------------------------------------------

def test_create_drive_success() -> None:
    """Valid drive with confirmed deadline is created successfully (201)."""
    payload = {
        "company_name": "Swiggy",
        "role_title": "Backend Engineer",
        "eligibility_raw": "8.0 CGPA, CSE/IT",
        "min_cgpa": 8.0,
        "eligible_branches": ["CSE", "IT"],
        "application_link": "https://careers.swiggy.com/jobs/456",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Application Deadline",
                "date_iso": "2026-08-10T23:59:59+05:30",
                "date_raw": "10th Aug EOD",
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            },
            {
                "date_type": "oa",
                "label": "Online Coding Round",
                "date_iso": "2026-08-12T14:00:00+05:30",
                "source": "ai_suggested",
                "confirmed_by_user": True,
            },
        ],
    }

    response = client.post("/drives", json=payload)

    assert response.status_code == 201
    data = response.json()
    assert "id" in data
    assert data["company_name"] == "Swiggy"
    assert data["company_type"] == "startup"
    assert data["role_title"] == "Backend Engineer"
    assert data["status"] == "confirmed"


# ---------------------------------------------------------------------------
# 4. Deduplication Check Tests (HTTP 409)
# ---------------------------------------------------------------------------

def test_dedup_check_returns_409_with_existing_drive_id() -> None:
    """Saving the same circular twice returns 409 with existing drive ID."""
    payload = {
        "company_name": "TCS",
        "role_title": "System Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Deadline",
                "date_iso": "2026-08-20T23:59:59+05:30",
                "date_raw": "20th Aug",
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            }
        ],
    }

    # First save -> succeeds with 201
    resp1 = client.post("/drives", json=payload)
    assert resp1.status_code == 201
    drive1_id = resp1.json()["id"]

    # Second save -> returns 409 Conflict with existing drive ID
    resp2 = client.post("/drives", json=payload)
    assert resp2.status_code == 409
    data2 = resp2.json()
    assert "existing_drive_id" in data2
    assert data2["existing_drive_id"] == drive1_id


# ---------------------------------------------------------------------------
# 5. File Upload Attachment Test
# ---------------------------------------------------------------------------

def test_create_drive_with_file_attachment() -> None:
    """Drive creation with attached PDF circular uploads file and saves drive."""
    import json

    payload = {
        "company_name": "Infosys",
        "role_title": "Specialist Programmer",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Deadline",
                "date_iso": "2026-08-25T23:59:59+05:30",
                "source": "user_added",
                "confirmed_by_user": True,
            }
        ],
    }

    file_content = b"%PDF-1.5 Dummy circular pdf text"
    files = {"file": ("infosys_circular.pdf", file_content, "application/pdf")}
    data = {"payload": json.dumps(payload)}

    response = client.post("/drives", data=data, files=files)

    assert response.status_code == 201
    resp_json = response.json()
    assert resp_json["company_name"] == "Infosys"
    assert resp_json["company_type"] == "service"


# ---------------------------------------------------------------------------
# 6. Off-Campus Manual Entry Test
# ---------------------------------------------------------------------------

def test_create_off_campus_manual_entry() -> None:
    """Manual off-campus entry with job description and application status."""
    payload = {
        "company_name": "Stripe",
        "role_title": "Backend Engineer",
        "job_description": "Payments infrastructure, distributed systems, Python/Go.",
        "application_status": "applied",
        "application_link": "https://stripe.com/jobs/123",
        "is_off_campus": True,
        "dates": [],
    }

    response = client.post("/drives", json=payload)
    assert response.status_code == 201
    drive_id = response.json()["id"]

    detail_resp = client.get(f"/drives/{drive_id}")
    assert detail_resp.status_code == 200
    detail = detail_resp.json()

    assert detail["role_title"] == "Backend Engineer"
    assert detail["job_description"] == "Payments infrastructure, distributed systems, Python/Go."
    assert detail["eligibility_raw"] == "Payments infrastructure, distributed systems, Python/Go."
    assert detail["application_status"] == "applied"
    assert detail["application_link"] == "https://stripe.com/jobs/123"
    assert detail["dates"] == []


# ---------------------------------------------------------------------------
# 7. Work Mode, Location & Drive Deletion Tests
# ---------------------------------------------------------------------------

def test_create_and_edit_location_and_work_mode() -> None:
    """Drive can be created with location + work_mode and edited anytime after."""
    payload = {
        "company_name": "Atlassian",
        "role_title": "SDE - 1",
        "location": "Bangalore",
        "work_mode": "hybrid",
        "is_off_campus": True,
        "dates": [],
    }

    create_resp = client.post("/drives", json=payload)
    assert create_resp.status_code == 201
    drive_id = create_resp.json()["id"]

    # Verify detail and dashboard list return location & work_mode
    detail = client.get(f"/drives/{drive_id}").json()
    assert detail["location"] == "Bangalore"
    assert detail["work_mode"] == "hybrid"

    cards = client.get("/drives").json()["drives"]
    matching = [c for c in cards if c["id"] == drive_id]
    assert len(matching) == 1
    assert matching[0]["location"] == "Bangalore"
    assert matching[0]["work_mode"] == "hybrid"

    # Edit work_mode and location after creation
    patch_resp = client.patch(
        f"/drives/{drive_id}",
        json={"location": "Remote (India)", "work_mode": "remote"},
    )
    assert patch_resp.status_code == 200
    updated = patch_resp.json()
    assert updated["location"] == "Remote (India)"
    assert updated["work_mode"] == "remote"


def test_invalid_work_mode_rejected() -> None:
    """Invalid work_mode values are rejected with HTTP 422."""
    resp = client.post(
        "/drives",
        json={
            "company_name": "Acme",
            "role_title": "Intern",
            "work_mode": "planet_mars",
            "is_off_campus": True,
            "dates": [],
        },
    )
    assert resp.status_code == 422


def test_delete_single_drive_and_bulk_delete() -> None:
    """DELETE /drives/{id} and POST /drives/bulk-delete remove owned drives cleanly."""
    d1 = client.post(
        "/drives",
        json={
            "company_name": "Company A",
            "role_title": "Role A",
            "is_off_campus": True,
            "dates": [],
        },
    ).json()["id"]
    d2 = client.post(
        "/drives",
        json={
            "company_name": "Company B",
            "role_title": "Role B",
            "is_off_campus": True,
            "dates": [],
        },
    ).json()["id"]
    d3 = client.post(
        "/drives",
        json={
            "company_name": "Company C",
            "role_title": "Role C",
            "is_off_campus": True,
            "dates": [],
        },
    ).json()["id"]

    # Single delete
    del_resp = client.delete(f"/drives/{d1}")
    assert del_resp.status_code == 204
    assert client.get(f"/drives/{d1}").status_code == 404
    assert client.delete(f"/drives/{d1}").status_code == 404

    # Bulk delete (includes an already-deleted ID which should be skipped gracefully)
    bulk_resp = client.post(
        "/drives/bulk-delete",
        json={"drive_ids": [d1, d2, d3]},
    )
    assert bulk_resp.status_code == 200
    bulk_data = bulk_resp.json()
    assert bulk_data["deleted_count"] == 2
    assert set(bulk_data["deleted_ids"]) == {d2, d3}
    assert client.get("/drives").json()["drives"] == []

