"""Automated unit and endpoint tests for drive deduplication matching logic (PRD 1.3.4 & 2.3)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.drive_service import clear_in_memory_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear test database state before each test run."""
    clear_in_memory_db()


def test_dedup_match_same_company_role_and_deadline() -> None:
    """Duplicate drive with same company, role, and primary deadline yields 409 Conflict."""
    payload1 = {
        "company_name": "Microsoft",
        "role_title": "Software Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Application Deadline",
                "date_iso": "2026-08-25T23:59:59+05:30",
                "source": "user_added",
                "confirmed_by_user": True,
                "is_primary_deadline": True,
            }
        ],
    }

    res1 = client.post("/drives", json=payload1)
    assert res1.status_code == 201
    drive_id = res1.json()["id"]

    # Exact duplicate
    res2 = client.post("/drives", json=payload1)
    assert res2.status_code == 409
    data = res2.json()
    assert data["existing_drive_id"] == drive_id


def test_dedup_match_case_insensitive_company_and_role() -> None:
    """Deduplication matches case-insensitively for company name and role title."""
    payload1 = {
        "company_name": "Flipkart",
        "role_title": "Backend Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "date_iso": "2026-08-30T23:59:59+05:30",
                "confirmed_by_user": True,
            }
        ],
    }

    payload2 = {
        "company_name": "FLIPKART",
        "role_title": "backend engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "date_iso": "2026-08-30T10:00:00+05:30",  # Same date YYYY-MM-DD
                "confirmed_by_user": True,
            }
        ],
    }

    res1 = client.post("/drives", json=payload1)
    assert res1.status_code == 201
    drive1_id = res1.json()["id"]

    res2 = client.post("/drives", json=payload2)
    assert res2.status_code == 409
    assert res2.json()["existing_drive_id"] == drive1_id


def test_dedup_no_match_different_role() -> None:
    """Same company and deadline date but different role creates a distinct drive."""
    payload1 = {
        "company_name": "Uber",
        "role_title": "Software Engineer",
        "dates": [
            {
                "date_type": "application_deadline",
                "date_iso": "2026-08-20T23:59:59+05:30",
                "confirmed_by_user": True,
            }
        ],
    }
    payload2 = {
        "company_name": "Uber",
        "role_title": "Product Manager Intern",
        "dates": [
            {
                "date_type": "application_deadline",
                "date_iso": "2026-08-20T23:59:59+05:30",
                "confirmed_by_user": True,
            }
        ],
    }

    res1 = client.post("/drives", json=payload1)
    res2 = client.post("/drives", json=payload2)

    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res1.json()["id"] != res2.json()["id"]


def test_dedup_no_match_different_deadline_date() -> None:
    """Same company and role but different deadline date creates a distinct drive."""
    payload1 = {
        "company_name": "Oracle",
        "role_title": "Application Developer",
        "dates": [
            {
                "date_type": "application_deadline",
                "date_iso": "2026-08-10T23:59:59+05:30",
                "confirmed_by_user": True,
            }
        ],
    }
    payload2 = {
        "company_name": "Oracle",
        "role_title": "Application Developer",
        "dates": [
            {
                "date_type": "application_deadline",
                "date_iso": "2026-09-10T23:59:59+05:30",
                "confirmed_by_user": True,
            }
        ],
    }

    res1 = client.post("/drives", json=payload1)
    res2 = client.post("/drives", json=payload2)

    assert res1.status_code == 201
    assert res2.status_code == 201
    assert res1.json()["id"] != res2.json()["id"]
