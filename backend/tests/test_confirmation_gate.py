"""Automated unit and endpoint tests for confirmation-gate rejection logic (PRD 1.3.3)."""

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.models.drives import ConfirmedDateItem
from app.services.drive_service import clear_in_memory_db, validate_and_normalize_deadlines

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear in-memory DB before each test."""
    clear_in_memory_db()


def test_confirmation_gate_rejection_no_dates() -> None:
    """Empty dates list raises HTTP 422."""
    with pytest.raises(HTTPException) as exc_info:
        validate_and_normalize_deadlines([])
    assert exc_info.value.status_code == 422
    assert "application_deadline" in exc_info.value.detail


def test_confirmation_gate_rejection_unconfirmed_deadline() -> None:
    """Date present but confirmed_by_user=False raises HTTP 422."""
    unconfirmed_item = ConfirmedDateItem(
        date_type="application_deadline",
        label="Apply Deadline",
        date_iso="2026-08-15T23:59:59+05:30",
        date_raw="15th Aug",
        source="ai_suggested",
        confirmed_by_user=False,
    )
    with pytest.raises(HTTPException) as exc_info:
        validate_and_normalize_deadlines([unconfirmed_item])
    assert exc_info.value.status_code == 422


def test_confirmation_gate_rejection_non_deadline_confirmed_only() -> None:
    """Confirmed interview date without confirmed application_deadline raises HTTP 422."""
    interview_item = ConfirmedDateItem(
        date_type="interview",
        label="Tech Interview",
        date_iso="2026-08-20T10:00:00+05:30",
        date_raw="20th Aug",
        source="user_added",
        confirmed_by_user=True,
    )
    with pytest.raises(HTTPException) as exc_info:
        validate_and_normalize_deadlines([interview_item])
    assert exc_info.value.status_code == 422


def test_confirmation_gate_success_and_primary_deadline_assignment() -> None:
    """Confirmed deadline passes gate and is designated as primary deadline."""
    deadline_item = ConfirmedDateItem(
        date_type="application_deadline",
        label="Deadline",
        date_iso="2026-08-15T23:59:59+05:30",
        date_raw="15th Aug",
        source="ai_suggested",
        confirmed_by_user=True,
    )
    oa_item = ConfirmedDateItem(
        date_type="oa",
        label="OA Date",
        date_iso="2026-08-17T10:00:00+05:30",
        source="user_added",
        confirmed_by_user=True,
    )

    processed = validate_and_normalize_deadlines([deadline_item, oa_item])
    assert len(processed) == 2
    assert processed[0].is_primary_deadline is True
    assert processed[1].is_primary_deadline is False


def test_create_drive_endpoint_422_without_confirmed_deadline() -> None:
    """POST /drives with missing confirmed deadline returns 422 Unprocessable Entity."""
    payload = {
        "company_name": "Acme Corp",
        "role_title": "Software Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Suggested Deadline",
                "date_iso": "2026-08-15T23:59:59+05:30",
                "date_raw": "Aug 15",
                "source": "ai_suggested",
                "confirmed_by_user": False,
            }
        ],
    }
    response = client.post("/drives", json=payload)
    assert response.status_code == 422
    assert "At least one application_deadline entry must be confirmed by the user" in response.text
