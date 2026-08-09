"""Automated unit and integration tests for diff-merge logic (PRD 1.3.4 & Prompt 5).

Verifies that new dates merge without touching existing confirmed dates.
"""

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
    """Reset in-memory database before test."""
    clear_in_memory_db()


def create_initial_drive() -> str:
    """Helper to create an initial drive with confirmed deadline."""
    payload = {
        "company_name": "Google",
        "role_title": "Software Engineer",
        "eligibility_raw": "8.0 CGPA",
        "min_cgpa": 8.0,
        "eligible_branches": ["CSE"],
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Initial Deadline",
                "date_iso": "2026-08-10T23:59:59+05:30",
                "date_raw": "10th Aug",
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            }
        ],
    }
    resp = client.post("/drives", json=payload)
    assert resp.status_code == 201
    return resp.json()["id"]


@patch("app.services.drive_service.extract_update_diff")
def test_diff_merge_new_dates_preserve_existing_confirmed(mock_extract_diff: MagicMock) -> None:
    """Merging a new interview date preserves existing confirmed dates."""
    drive_id = create_initial_drive()

    mock_diff = UpdateResult(
        new_dates=[
            DetectedDate(
                date_type="interview",
                label="Tech Interview Round 1",
                date_iso="2026-08-18T10:00:00+05:30",
                date_raw="18th August 10 AM",
            )
        ],
        field_changes={},
        summary_of_changes="Added tech interview date for 18th August",
    )
    mock_extract_diff.return_value = (mock_diff, "success", None)

    # 1. Propose update draft
    prop_resp = client.post(
        f"/drives/{drive_id}/updates",
        json={"text": "Interviews announced for 18th August at 10 AM"},
    )
    assert prop_resp.status_code == 200
    update_id = prop_resp.json()["update_id"]

    # 2. Confirm and merge update
    confirm_payload = {
        "confirmed_new_dates": [
            {
                "date_type": "interview",
                "label": "Tech Interview Round 1",
                "date_iso": "2026-08-18T10:00:00+05:30",
                "date_raw": "18th August 10 AM",
                "source": "ai_suggested",
                "confirmed_by_user": True,
            }
        ],
        "confirmed_field_changes": {},
        "summary_of_changes": "Added tech interview date for 18th August",
        "raw_text": "Interviews announced for 18th August at 10 AM",
        "source_type": "whatsapp_text",
    }

    confirm_resp = client.patch(
        f"/drives/{drive_id}/updates/{update_id}/confirm",
        json=confirm_payload,
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["added_dates_count"] == 1

    # 3. Verify drive summary includes BOTH initial application_deadline AND new interview date
    summary = build_existing_drive_summary(drive_id, user_id=MOCK_USER)
    assert "application_deadline: 2026-08-10T23:59:59+05:30" in summary
    assert "interview: 2026-08-18T10:00:00+05:30" in summary


@patch("app.services.drive_service.extract_update_diff")
def test_diff_merge_field_changes(mock_extract_diff: MagicMock) -> None:
    """Updating a field (min_cgpa) updates the drive field while keeping dates intact."""
    drive_id = create_initial_drive()

    mock_diff = UpdateResult(
        new_dates=[],
        field_changes={"min_cgpa": 8.5},
        summary_of_changes="Revised min CGPA to 8.5",
    )
    mock_extract_diff.return_value = (mock_diff, "success", None)

    prop_resp = client.post(
        f"/drives/{drive_id}/updates",
        json={"text": "Min CGPA updated to 8.5"},
    )
    update_id = prop_resp.json()["update_id"]

    confirm_resp = client.patch(
        f"/drives/{drive_id}/updates/{update_id}/confirm",
        json={
            "confirmed_new_dates": [],
            "confirmed_field_changes": {"min_cgpa": 8.5},
            "summary_of_changes": "Revised min CGPA to 8.5",
        },
    )
    assert confirm_resp.status_code == 200

    summary = build_existing_drive_summary(drive_id, user_id=MOCK_USER)
    assert "Min CGPA: 8.5" in summary
    assert "application_deadline: 2026-08-10T23:59:59+05:30" in summary
