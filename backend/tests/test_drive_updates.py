"""Automated unit and integration tests for Add Update flow (PRD 1.3.4, 3.2, 3.3)."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.extraction import DetectedDate, UpdateResult
from app.services.drive_service import build_existing_drive_summary, clear_in_memory_db

client = TestClient(app)

MOCK_USER = "00000000-0000-0000-0000-000000000001"


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear test database state before each test."""
    clear_in_memory_db()


def create_initial_drive() -> str:
    """Helper to create an initial confirmed drive and return drive_id."""
    payload = {
        "company_name": "Google",
        "role_title": "Software Engineer Intern",
        "eligibility_raw": "8.5 CGPA and above, CSE/ECE only",
        "min_cgpa": 8.5,
        "eligible_branches": ["CSE", "ECE"],
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Resume Submission",
                "date_iso": "2026-08-10T23:59:59+05:30",
                "date_raw": "10th Aug EOD",
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            }
        ],
    }
    resp = client.post("/drives", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


def test_build_existing_drive_summary() -> None:
    drive_id = create_initial_drive()
    summary = build_existing_drive_summary(drive_id, user_id=MOCK_USER)

    assert "Company: Google" in summary
    assert "Role Title: Software Engineer Intern" in summary
    assert "Min CGPA: 8.5" in summary
    assert "application_deadline: 2026-08-10T23:59:59+05:30" in summary


@patch("app.services.drive_service.extract_update_diff")
def test_propose_drive_update_text(mock_extract_diff: MagicMock) -> None:
    drive_id = create_initial_drive()

    mock_diff = UpdateResult(
        new_dates=[
            DetectedDate(
                date_type="interview",
                label="Tech Interview Round 1",
                date_iso="2026-08-12T10:00:00+05:30",
                date_raw="Interview on Aug 12 10 AM",
            )
        ],
        field_changes={},
        summary_of_changes="Added interview date: Aug 12 10 AM",
    )
    mock_extract_diff.return_value = (mock_diff, "success", None)

    follow_up_text = "Interviews scheduled for Aug 12th at 10 AM for all shortlisted candidates."
    response = client.post(f"/drives/{drive_id}/updates", json={"text": follow_up_text})

    assert response.status_code == 200
    data = response.json()
    assert data["drive_id"] == drive_id
    assert "update_id" in data
    diff_res = data["update_result"]
    assert len(diff_res["new_dates"]) == 1
    assert diff_res["new_dates"][0]["date_type"] == "interview"
    assert diff_res["summary_of_changes"] == "Added interview date: Aug 12 10 AM"

    mock_extract_diff.assert_called_once()
    called_summary = mock_extract_diff.call_args.kwargs["existing_drive_summary"]
    assert "Company: Google" in called_summary


def test_propose_update_invalid_drive_404() -> None:
    response = client.post("/drives/non-existent-id/updates", json={"text": "some update"})
    assert response.status_code == 404
    assert "not found" in response.text.lower()


@patch("app.services.drive_service.extract_update_diff")
def test_confirm_drive_update_flow(mock_extract_diff: MagicMock) -> None:
    """Complete Add Update flow: propose diff -> confirm -> verify merged state."""
    drive_id = create_initial_drive()

    mock_diff = UpdateResult(
        new_dates=[
            DetectedDate(
                date_type="interview",
                label="Tech Interview",
                date_iso="2026-08-12T10:00:00+05:30",
                date_raw="Interview on Aug 12",
            )
        ],
        field_changes={"min_cgpa": 8.0},
        summary_of_changes="Added interview date on Aug 12; revised min CGPA to 8.0",
    )
    mock_extract_diff.return_value = (mock_diff, "success", None)

    prop_resp = client.post(
        f"/drives/{drive_id}/updates",
        json={"text": "Interview on Aug 12. Cutoff updated to 8.0."},
    )
    assert prop_resp.status_code == 200
    prop_data = prop_resp.json()
    update_id = prop_data["update_id"]

    confirm_payload = {
        "confirmed_new_dates": [
            {
                "date_type": "interview",
                "label": "Tech Interview",
                "date_iso": "2026-08-12T10:00:00+05:30",
                "date_raw": "Interview on Aug 12",
                "source": "ai_suggested",
                "confirmed_by_user": True,
            }
        ],
        "confirmed_field_changes": {"min_cgpa": 8.0},
        "summary_of_changes": "Added interview date on Aug 12",
        "raw_text": "Interview on Aug 12. Cutoff updated to 8.0.",
        "source_type": "whatsapp_text",
    }

    confirm_resp = client.patch(
        f"/drives/{drive_id}/updates/{update_id}/confirm",
        json=confirm_payload,
    )

    assert confirm_resp.status_code == 200
    conf_data = confirm_resp.json()
    assert conf_data["drive_id"] == drive_id
    assert conf_data["update_id"] == update_id
    assert conf_data["added_dates_count"] == 1

    summary_after = build_existing_drive_summary(drive_id, user_id=MOCK_USER)
    assert "interview: 2026-08-12T10:00:00+05:30" in summary_after
    assert "application_deadline: 2026-08-10T23:59:59+05:30" in summary_after
    assert "Min CGPA: 8.0" in summary_after
