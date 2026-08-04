"""Drive persistence service.

Handles:
1. Re-validation of confirmed application deadline (HTTP 422 if missing).
2. Setting is_primary_deadline=true on exactly one application_deadline row.
3. Company lookup & classification (static lookup + LLM fallback).
4. Deduplication check on (company_id, role_title, primary_deadline_date) -> HTTP 409 with existing_drive_id.
5. Persistence to `companies`, `drives`, `drive_dates`, `applications`, and `drive_documents`.
6. Uploading attached files to Supabase Storage bucket (`drive-documents`).
"""

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status

from app.config import get_settings
from app.models.drives import (
    ConfirmedDateItem,
    CreateDriveRequest,
    DriveResponse,
)
from app.services.company_classifier import classify_company
from app.supabase_client import get_service_client

logger = logging.getLogger(__name__)

# Fallback in-memory storage for test/offline execution when Supabase is unconfigured
_in_memory_companies: dict[str, dict[str, Any]] = {}  # company_id -> dict
_in_memory_drives: dict[str, dict[str, Any]] = {}     # drive_id -> dict
_in_memory_dates: list[dict[str, Any]] = []
_in_memory_applications: dict[str, dict[str, Any]] = {}
_in_memory_documents: list[dict[str, Any]] = []


def clear_in_memory_db() -> None:
    """Clear in-memory fallback stores (useful for testing)."""
    _in_memory_companies.clear()
    _in_memory_drives.clear()
    _in_memory_dates.clear()
    _in_memory_applications.clear()
    _in_memory_documents.clear()


def validate_and_normalize_deadlines(dates: list[ConfirmedDateItem]) -> list[ConfirmedDateItem]:
    """Re-validate that at least one date_type=application_deadline has confirmed_by_user=true.

    Ensures exactly one application_deadline date has is_primary_deadline=True.
    Raises HTTP 422 if no confirmed application deadline exists.
    """
    confirmed_deadlines = [
        d for d in dates if d.date_type == "application_deadline" and d.confirmed_by_user
    ]

    if not confirmed_deadlines:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one application_deadline entry must be confirmed by the user.",
        )

    # Determine primary deadline
    primary_chosen = False
    # Check if any confirmed deadline was explicitly marked primary
    for d in dates:
        if d.date_type == "application_deadline" and d.confirmed_by_user and d.is_primary_deadline:
            if not primary_chosen:
                primary_chosen = True
            else:
                d.is_primary_deadline = False  # Reset duplicates

    # If no confirmed deadline had is_primary_deadline=True, set the first confirmed one
    if not primary_chosen:
        for d in dates:
            if d.date_type == "application_deadline" and d.confirmed_by_user:
                d.is_primary_deadline = True
                break

    # Ensure all non-primary dates are set to False
    primary_found = False
    for d in dates:
        if d.is_primary_deadline:
            if not primary_found and d.date_type == "application_deadline" and d.confirmed_by_user:
                primary_found = True
            else:
                d.is_primary_deadline = False

    return dates


def _get_primary_deadline_date_iso(dates: list[ConfirmedDateItem]) -> str:
    """Extract date_iso string of the primary application deadline."""
    for d in dates:
        if d.is_primary_deadline:
            return d.date_iso
    for d in dates:
        if d.date_type == "application_deadline" and d.confirmed_by_user:
            return d.date_iso
    raise ValueError("No primary deadline date found.")


def save_drive(
    payload: CreateDriveRequest,
    user_id: str,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    content_type: str | None = None,
) -> DriveResponse:
    """Save confirmed drive data and attached document.

    Raises:
        HTTPException(422): If deadline validation fails.
        HTTPException(409): If matching drive already exists (includes existing_drive_id).
    """
    settings = get_settings()

    # 1. Server-side deadline validation & primary flag normalization
    payload.dates = validate_and_normalize_deadlines(payload.dates)
    primary_date_iso = _get_primary_deadline_date_iso(payload.dates)
    primary_date_str = primary_date_iso.split("T")[0]

    company_name_clean = payload.company_name.strip()
    role_title_clean = payload.role_title.strip()

    # 2. Company lookup or creation
    company_id: str | None = None
    company_type: str | None = None

    use_supabase = bool(settings.supabase_url and settings.supabase_service_role_key)

    if use_supabase:
        try:
            supabase = get_service_client()
            # Lookup company
            res = (
                supabase.table("companies")
                .select("id, company_type, name")
                .ilike("name", company_name_clean)
                .execute()
            )
            if res.data:
                company_id = res.data[0]["id"]
                company_type = res.data[0]["company_type"]
            else:
                # Classify & insert company
                company_type = classify_company(company_name_clean, settings=settings)
                new_company_id = str(uuid.uuid4())
                company_row = {
                    "id": new_company_id,
                    "name": company_name_clean,
                    "company_type": company_type,
                }
                supabase.table("companies").insert(company_row).execute()
                company_id = new_company_id
        except Exception as err:
            logger.warning("Supabase company operation failed, falling back to in-memory: %s", err)
            use_supabase = False

    if not use_supabase or not company_id:
        # Fallback to in-memory storage
        for cid, comp in _in_memory_companies.items():
            if comp["name"].lower() == company_name_clean.lower():
                company_id = cid
                company_type = comp["company_type"]
                break

        if not company_id:
            company_type = classify_company(company_name_clean, settings=settings)
            company_id = str(uuid.uuid4())
            _in_memory_companies[company_id] = {
                "id": company_id,
                "name": company_name_clean,
                "company_type": company_type,
            }

    # 3. Deduplication check on (company_id, role_title, primary deadline date)
    existing_drive_id: str | None = None

    if use_supabase:
        try:
            supabase = get_service_client()
            # Query user's drives for this company
            drives_res = (
                supabase.table("drives")
                .select("id, role_title")
                .eq("user_id", user_id)
                .eq("company_id", company_id)
                .execute()
            )
            for d_row in drives_res.data:
                if d_row["role_title"].strip().lower() == role_title_clean.lower():
                    # Check drive_dates for matching primary deadline date
                    dates_res = (
                        supabase.table("drive_dates")
                        .select("date_iso")
                        .eq("drive_id", d_row["id"])
                        .eq("is_primary_deadline", True)
                        .execute()
                    )
                    for date_row in dates_res.data:
                        d_iso = date_row["date_iso"]
                        if d_iso.split("T")[0] == primary_date_str:
                            existing_drive_id = d_row["id"]
                            break
                    if existing_drive_id:
                        break
        except Exception as err:
            logger.warning("Supabase dedup check failed: %s", err)

    if not existing_drive_id:
        # Check in-memory fallback
        for did, d_row in _in_memory_drives.items():
            if (
                d_row["user_id"] == user_id
                and d_row["company_id"] == company_id
                and d_row["role_title"].strip().lower() == role_title_clean.lower()
            ):
                for date_row in _in_memory_dates:
                    if (
                        date_row["drive_id"] == did
                        and date_row.get("is_primary_deadline")
                        and date_row["date_iso"].split("T")[0] == primary_date_str
                    ):
                        existing_drive_id = did
                        break
            if existing_drive_id:
                break

    if existing_drive_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": "A drive with matching company, role, and primary deadline already exists.",
                "existing_drive_id": existing_drive_id,
            },
        )

    # 4. Insert Drive
    drive_id = str(uuid.uuid4())
    drive_row = {
        "id": drive_id,
        "user_id": user_id,
        "company_id": company_id,
        "role_title": role_title_clean,
        "eligibility_raw": payload.eligibility_raw,
        "min_cgpa": payload.min_cgpa,
        "eligible_branches": payload.eligible_branches,
        "status": "confirmed",
    }

    # Prepare date rows
    date_rows = [
        {
            "id": str(uuid.uuid4()),
            "drive_id": drive_id,
            "date_type": d.date_type,
            "label": d.label,
            "date_iso": d.date_iso,
            "date_raw": d.date_raw,
            "source": d.source,
            "confirmed_by_user": d.confirmed_by_user,
            "is_primary_deadline": d.is_primary_deadline,
        }
        for d in payload.dates
    ]

    # Prepare application row
    app_row = {
        "id": str(uuid.uuid4()),
        "drive_id": drive_id,
        "status": "not_applied",
        "notes": payload.application_link if payload.application_link else None,
    }

    # 5. Handle document upload if file provided
    storage_path: str | None = None
    if file_bytes and filename:
        storage_path = f"{user_id}/{drive_id}/{filename}"
        if use_supabase:
            try:
                supabase = get_service_client()
                supabase.storage.from_("drive-documents").upload(
                    path=storage_path,
                    file=file_bytes,
                    file_options={"content-type": content_type or "application/octet-stream"},
                )
            except Exception as err:
                logger.warning("Could not upload file to Supabase Storage: %s", err)

    doc_row = None
    if storage_path and filename:
        doc_row = {
            "id": str(uuid.uuid4()),
            "drive_id": drive_id,
            "drive_update_id": None,
            "storage_path": storage_path,
            "original_filename": filename,
        }

    # Write to Supabase or In-Memory
    written_to_supabase = False
    if use_supabase:
        try:
            supabase = get_service_client()
            supabase.table("drives").insert(drive_row).execute()
            supabase.table("drive_dates").insert(date_rows).execute()
            supabase.table("applications").insert(app_row).execute()
            if doc_row:
                supabase.table("drive_documents").insert(doc_row).execute()
            written_to_supabase = True
        except Exception as err:
            logger.warning("Failed writing drive data to Supabase: %s", err)

    if not written_to_supabase:
        # Save to in-memory fallback
        _in_memory_drives[drive_id] = drive_row
        _in_memory_dates.extend(date_rows)
        _in_memory_applications[drive_id] = app_row
        if doc_row:
            _in_memory_documents.append(doc_row)

    return DriveResponse(
        id=drive_id,
        company_id=company_id,
        company_name=company_name_clean,
        company_type=company_type or "unknown",
        role_title=role_title_clean,
        status="confirmed",
        message="Drive created successfully",
    )
