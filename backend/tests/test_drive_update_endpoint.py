"""Automated unit and integration tests for direct drive editing (PATCH /drives/{id})."""

import os

os.environ["SENTRY_DSN"] = ""
os.environ["SUPABASE_URL"] = ""
os.environ["SUPABASE_SERVICE_ROLE_KEY"] = ""

import pytest  # noqa: E402

from app.models.drives import (  # noqa: E402
    ConfirmedDateItem,
    CreateDriveRequest,
    UpdateDriveRequest,
)
from app.services.drive_service import (  # noqa: E402
    bulk_delete_drives,
    clear_in_memory_db,
    delete_drive,
    get_drive_detail,
    list_drives_for_dashboard,
    save_drive,
    update_drive,
)


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear in-memory state before each test."""
    clear_in_memory_db()


def create_sample_drive(user_id: str = "test-user-1") -> str:
    """Create a sample drive in memory and return its ID."""
    payload = CreateDriveRequest(
        company_name="Google",
        role_title="Software Engineer",
        min_cgpa=8.0,
        eligible_branches=["CSE", "IT"],
        application_link="https://careers.google.com/jobs/123",
        ctc_display=None,
        dates=[
            ConfirmedDateItem(
                date_type="application_deadline",
                label="Application Deadline",
                date_iso="2026-08-30T23:59:59+05:30",
                date_raw="Aug 30",
                source="user_added",
                confirmed_by_user=True,
                is_primary_deadline=True,
            )
        ],
    )
    res = save_drive(payload=payload, user_id=user_id)
    return res.id


def test_update_drive_ctc_only() -> None:
    """update_drive updates ctc_display cleanly without touching other fields."""
    drive_id = create_sample_drive()

    req = UpdateDriveRequest(ctc_display="₹34.50 LPA")
    updated = update_drive(drive_id=drive_id, user_id="test-user-1", payload=req)

    assert updated.id == drive_id
    assert updated.ctc_display == "₹34.50 LPA"
    assert updated.role_title == "Software Engineer"
    assert updated.min_cgpa == 8.0

    # Verify get_drive_detail also sees the updated CTC
    refetched = get_drive_detail(drive_id=drive_id, user_id="test-user-1")
    assert refetched.ctc_display == "₹34.50 LPA"


def test_update_drive_multiple_fields() -> None:
    """update_drive updates multiple fields simultaneously."""
    drive_id = create_sample_drive()

    req = UpdateDriveRequest(
        ctc_display="₹42 LPA",
        role_title="Senior Software Engineer",
        min_cgpa=8.5,
        eligible_branches=["CSE", "IT", "ECE"],
        application_link="https://careers.google.com/jobs/updated",
        job_description="Updated description with deep requirements.",
    )
    updated = update_drive(drive_id=drive_id, user_id="test-user-1", payload=req)

    assert updated.ctc_display == "₹42 LPA"
    assert updated.role_title == "Senior Software Engineer"
    assert updated.min_cgpa == 8.5
    assert updated.eligible_branches == ["CSE", "IT", "ECE"]
    assert updated.application_link == "https://careers.google.com/jobs/updated"
    assert updated.job_description == "Updated description with deep requirements."


def test_update_non_existent_drive_raises_404() -> None:
    """update_drive raises 404 HTTPException when drive ID does not exist."""
    from fastapi import HTTPException

    req = UpdateDriveRequest(ctc_display="10 LPA")
    with pytest.raises(HTTPException) as exc_info:
        update_drive(drive_id="non_existent_uuid_999", user_id="test-user-1", payload=req)

    assert exc_info.value.status_code == 404


def test_update_drive_clear_ctc() -> None:
    """update_drive allows setting ctc_display to None."""
    drive_id = create_sample_drive()

    # Set CTC first
    update_drive(
        drive_id=drive_id,
        user_id="test-user-1",
        payload=UpdateDriveRequest(ctc_display="20 LPA"),
    )
    # Clear CTC
    updated = update_drive(
        drive_id=drive_id,
        user_id="test-user-1",
        payload=UpdateDriveRequest(ctc_display=None),
    )
    assert updated.ctc_display is None


def test_create_and_edit_location_and_work_mode() -> None:
    """Drives persist location + work_mode on create and allow editing anytime."""
    payload = CreateDriveRequest(
        company_name="Atlassian",
        role_title="SDE - 1",
        location="Bangalore",
        work_mode="hybrid",
        is_off_campus=True,
        dates=[],
    )
    res = save_drive(payload=payload, user_id="test-user-1")

    detail = get_drive_detail(drive_id=res.id, user_id="test-user-1")
    assert detail.location == "Bangalore"
    assert detail.work_mode == "hybrid"

    dashboard = list_drives_for_dashboard(user_id="test-user-1")
    assert len(dashboard.drives) == 1
    assert dashboard.drives[0].location == "Bangalore"
    assert dashboard.drives[0].work_mode == "hybrid"

    updated = update_drive(
        drive_id=res.id,
        user_id="test-user-1",
        payload=UpdateDriveRequest(location="Remote (India)", work_mode="remote"),
    )
    assert updated.location == "Remote (India)"
    assert updated.work_mode == "remote"


def test_delete_and_bulk_delete_drives_with_isolation() -> None:
    """delete_drive and bulk_delete_drives enforce ownership and remove drives."""
    from fastapi import HTTPException

    d1 = create_sample_drive(user_id="test-user-1")
    d2 = save_drive(
        payload=CreateDriveRequest(
            company_name="Stripe",
            role_title="Backend",
            is_off_campus=True,
            dates=[],
        ),
        user_id="test-user-1",
    ).id
    other_user_drive = create_sample_drive(user_id="other-user-2")

    # Cross-tenant delete must fail with 404
    with pytest.raises(HTTPException) as exc_info:
        delete_drive(drive_id=other_user_drive, user_id="test-user-1")
    assert exc_info.value.status_code == 404

    # Single delete
    delete_drive(drive_id=d1, user_id="test-user-1")
    with pytest.raises(HTTPException) as exc_info:
        get_drive_detail(drive_id=d1, user_id="test-user-1")
    assert exc_info.value.status_code == 404

    # Bulk delete skips non-owned / already-deleted IDs and deletes owned ones
    bulk_res = bulk_delete_drives(
        drive_ids=[d1, d2, other_user_drive],
        user_id="test-user-1",
    )
    assert bulk_res.deleted_count == 1
    assert bulk_res.deleted_ids == [d2]
    assert list_drives_for_dashboard(user_id="test-user-1").drives == []
    assert len(list_drives_for_dashboard(user_id="other-user-2").drives) == 1

