"""Automated tests for Drive Detail, Timeline, and Signed Documents (PRD 1.3.4)."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.extraction import DetectedDate, UpdateResult
from app.services.drive_service import clear_in_memory_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear test database state before each test."""
    clear_in_memory_db()


def create_sample_drive() -> str:
    """Helper to create initial drive with an attached circular file."""
    payload = {
        "company_name": "Atlassian",
        "role_title": "Software Engineer",
        "eligibility_raw": "8.0 CGPA",
        "min_cgpa": 8.0,
        "eligible_branches": ["CSE", "IT"],
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Apply Deadline",
                "date_iso": "2026-08-15T23:59:59+05:30",
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            }
        ],
    }

    import json

    files = {"file": ("initial_circular.pdf", b"%PDF-1.4 Initial circular", "application/pdf")}
    data = {"payload": json.dumps(payload)}

    resp = client.post("/drives", data=data, files=files)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_get_drive_detail() -> None:
    drive_id = create_sample_drive()
    resp = client.get(f"/drives/{drive_id}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == drive_id
    assert data["company_name"] == "Atlassian"
    assert data["company_type"] == "product"
    assert data["role_title"] == "Software Engineer"
    assert data["application_status"] == "not_applied"
    assert len(data["dates"]) == 1
    assert data["dates"][0]["date_type"] == "application_deadline"


@patch("app.services.drive_service.extract_update_diff")
def test_timeline_chronological_order_for_two_updates(mock_extract_diff: MagicMock) -> None:
    """Acceptance Criteria: Drive with two updates shows three timeline entries in order."""
    drive_id = create_sample_drive()

    # Mock diff for update 1
    mock_extract_diff.return_value = (
        UpdateResult(
            new_dates=[
                DetectedDate(
                    date_type="oa",
                    label="Online Test",
                    date_iso="2026-08-18T10:00:00+05:30",
                    date_raw="OA on Aug 18",
                )
            ],
            summary_of_changes="Added OA date: Aug 18",
        ),
        "success",
        None,
    )

    # 1. Propose & Confirm Update 1
    up1 = client.post(f"/drives/{drive_id}/updates", json={"text": "OA on Aug 18"})
    assert up1.status_code == 200
    update1_id = up1.json()["update_id"]

    conf1 = client.patch(
        f"/drives/{drive_id}/updates/{update1_id}/confirm",
        json={
            "confirmed_new_dates": [
                {
                    "date_type": "oa",
                    "label": "Online Test",
                    "date_iso": "2026-08-18T10:00:00+05:30",
                    "date_raw": "OA on Aug 18",
                    "source": "ai_suggested",
                    "confirmed_by_user": True,
                }
            ],
            "summary_of_changes": "Added OA date: Aug 18",
        },
    )
    assert conf1.status_code == 200

    # Mock diff for update 2
    mock_extract_diff.return_value = (
        UpdateResult(
            new_dates=[
                DetectedDate(
                    date_type="interview",
                    label="Final Interview",
                    date_iso="2026-08-22T09:00:00+05:30",
                    date_raw="Interview on Aug 22",
                )
            ],
            summary_of_changes="Added interview date: Aug 22",
        ),
        "success",
        None,
    )

    # 2. Propose & Confirm Update 2
    up2 = client.post(f"/drives/{drive_id}/updates", json={"text": "Interview on Aug 22"})
    assert up2.status_code == 200
    update2_id = up2.json()["update_id"]

    conf2 = client.patch(
        f"/drives/{drive_id}/updates/{update2_id}/confirm",
        json={
            "confirmed_new_dates": [
                {
                    "date_type": "interview",
                    "label": "Final Interview",
                    "date_iso": "2026-08-22T09:00:00+05:30",
                    "date_raw": "Interview on Aug 22",
                    "source": "ai_suggested",
                    "confirmed_by_user": True,
                }
            ],
            "summary_of_changes": "Added interview date: Aug 22",
        },
    )
    assert conf2.status_code == 200

    # 3. Fetch Timeline -> exactly 3 entries in chronological order
    time_resp = client.get(f"/drives/{drive_id}/timeline")
    assert time_resp.status_code == 200
    time_data = time_resp.json()["timeline"]

    assert len(time_data) == 3
    assert time_data[0]["event_type"] == "initial_capture"
    assert time_data[0]["summary_of_changes"] == "Initial capture"
    assert time_data[1]["event_type"] == "update"
    assert "OA date: Aug 18" in time_data[1]["summary_of_changes"]
    assert time_data[2]["event_type"] == "update"
    assert "interview date: Aug 22" in time_data[2]["summary_of_changes"]


def test_documents_list_with_download_urls() -> None:
    """Acceptance Criteria: Every uploaded file is listed and downloadable."""
    drive_id = create_sample_drive()

    doc_resp = client.get(f"/drives/{drive_id}/documents")
    assert doc_resp.status_code == 200
    docs = doc_resp.json()["documents"]

    assert len(docs) == 1
    doc = docs[0]
    assert doc["original_filename"] == "initial_circular.pdf"
    assert "download_url" in doc
    assert len(doc["download_url"]) > 0

    # Test download endpoint
    dl_resp = client.get(doc["download_url"])
    assert dl_resp.status_code == 200
