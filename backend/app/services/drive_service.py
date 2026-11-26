"""Drive persistence and update service.

Handles:
1. Re-validation of confirmed application deadline (HTTP 422 if missing, except off-campus).
2. Setting is_primary_deadline=true on at most one application_deadline row.
3. Company lookup & classification (normalized name_key + upsert).
4. Deduplication check on (company_id, role_title, primary_deadline_date) -> HTTP 409.
5. Atomic persistence via Supabase RPCs (`create_drive_atomic`, `confirm_drive_update_atomic`).
6. In-memory fallback strictly gated behind `TESTING=1`.
7. Timezone-consistent IST (`Asia/Kolkata`) date comparisons.
"""

import json
import logging
import os
import time
import uuid
import zoneinfo
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

from app.config import get_settings
from app.models.drives import (
    ApplicationResponse,
    ConfirmedDateItem,
    ConfirmUpdatePayload,
    ConfirmUpdateResponse,
    CreateDriveRequest,
    DeleteDriveResponse,
    DocumentItem,
    DriveCardResponse,
    DriveDateSaved,
    DriveDetailResponse,
    DriveDocumentsResponse,
    DriveListResponse,
    DriveResponse,
    DriveTimelineResponse,
    TimelineEvent,
    UpdateDriveRequest,
)
from app.models.extraction import DriveUpdateDraftResponse
from app.services.company_classifier import classify_company
from app.services.llm import extract_update_diff
from app.services.parsers import validate_and_parse_file
from app.supabase_client import get_service_client

logger = logging.getLogger(__name__)
KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

# In-memory storage strictly for TESTING=1 offline execution
_in_memory_companies: dict[str, dict[str, Any]] = {}
_in_memory_drives: dict[str, dict[str, Any]] = {}
_in_memory_dates: list[dict[str, Any]] = []
_in_memory_applications: dict[str, dict[str, Any]] = {}
_in_memory_documents: list[dict[str, Any]] = []
_in_memory_updates: list[dict[str, Any]] = []
_in_memory_update_drafts: dict[str, dict[str, Any]] = {}

_DRAFT_TTL_SECONDS = 3600.0
_MAX_UPDATE_DRAFTS = 100

ALLOWED_DRIVE_FIELDS = {
    "min_cgpa",
    "eligibility_raw",
    "job_description",
    "role_title",
    "application_link",
    "eligible_branches",
    "ctc_display",
    "location",
    "work_mode",
}

_VALID_DATE_TYPES = {
    "application_deadline",
    "oa",
    "interview",
    "ppt",
    "result",
    "joining",
    "other",
}


def _is_testing() -> bool:
    return os.environ.get("TESTING") == "1"


def _use_supabase() -> bool:
    settings = get_settings()
    configured = bool(settings.supabase_url and settings.supabase_service_role_key)
    if not configured and not _is_testing():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured.",
        )
    return configured


def _prune_update_drafts() -> None:
    """Evict expired or excess in-memory update drafts to prevent unbounded growth."""
    now = time.monotonic()
    expired = [
        uid
        for uid, info in _in_memory_update_drafts.items()
        if (now - info.get("_created_monotonic", now)) > _DRAFT_TTL_SECONDS
    ]
    for uid in expired:
        _in_memory_update_drafts.pop(uid, None)

    while len(_in_memory_update_drafts) >= _MAX_UPDATE_DRAFTS:
        oldest_key = next(iter(_in_memory_update_drafts))
        _in_memory_update_drafts.pop(oldest_key, None)


def clear_in_memory_db() -> None:
    """Clear in-memory fallback stores (useful for testing)."""
    _in_memory_companies.clear()
    _in_memory_drives.clear()
    _in_memory_dates.clear()
    _in_memory_applications.clear()
    _in_memory_documents.clear()
    _in_memory_updates.clear()
    _in_memory_update_drafts.clear()


def _to_ist_date_str(iso_or_dt: str | datetime) -> str:
    """Convert an ISO string or datetime to an Asia/Kolkata YYYY-MM-DD date string."""
    if isinstance(iso_or_dt, datetime):
        dt = iso_or_dt
    else:
        dt = datetime.fromisoformat(str(iso_or_dt))
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=KOLKATA_TZ)
    return dt.astimezone(KOLKATA_TZ).date().isoformat()


def generate_signed_storage_url(
    storage_path: str,
    doc_id: str = "",
    expires_in_seconds: int = 300,
) -> str:
    """Generate a short-expiry (5-minute) signed URL via Supabase Storage."""
    try:
        supabase = get_service_client()
        res = supabase.storage.from_("drive-documents").create_signed_url(
            storage_path, expires_in_seconds
        )
        if isinstance(res, dict) and "signedUrl" in res:
            return res["signedUrl"]
        if hasattr(res, "get") and res.get("signedURL"):
            return str(res.get("signedURL"))
        if isinstance(res, str):
            return res
    except Exception as err:
        logger.warning("Could not generate Supabase Storage signed URL: %s", err)

    return f"/drives/documents/{doc_id}/download"


def validate_and_normalize_deadlines(
    dates: list[ConfirmedDateItem],
    is_off_campus: bool = False,
) -> list[ConfirmedDateItem]:
    """Re-validate that at least one application_deadline has confirmed_by_user=true.

    Off-campus entries may have zero dates. Ensures at most one date has
    is_primary_deadline=True. Raises HTTP 422 if a campus drive has no confirmed deadline.
    """
    if is_off_campus and not dates:
        return []

    confirmed_deadlines = [
        d for d in dates if d.date_type == "application_deadline" and d.confirmed_by_user
    ]

    if not confirmed_deadlines:
        if is_off_campus:
            for d in dates:
                d.is_primary_deadline = False
            return dates
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="At least one application_deadline entry must be confirmed by the user.",
        )

    primary_chosen = False
    for d in dates:
        if d.date_type == "application_deadline" and d.confirmed_by_user and d.is_primary_deadline:
            if not primary_chosen:
                primary_chosen = True
            else:
                d.is_primary_deadline = False

    if not primary_chosen:
        for d in dates:
            if d.date_type == "application_deadline" and d.confirmed_by_user:
                d.is_primary_deadline = True
                break

    primary_found = False
    for d in dates:
        if d.is_primary_deadline:
            if not primary_found and d.date_type == "application_deadline" and d.confirmed_by_user:
                primary_found = True
            else:
                d.is_primary_deadline = False

    return dates


def _get_primary_deadline_dt(dates: list[ConfirmedDateItem]) -> datetime | None:
    """Extract datetime of the primary application deadline, or None if absent."""
    for d in dates:
        if d.is_primary_deadline:
            return d.date_iso
    for d in dates:
        if d.date_type == "application_deadline" and d.confirmed_by_user:
            return d.date_iso
    return None


def save_drive(
    payload: CreateDriveRequest,
    user_id: str,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    content_type: str | None = None,
) -> DriveResponse:
    """Save confirmed drive data and attached document atomically."""
    settings = get_settings()
    now_iso = datetime.now(KOLKATA_TZ).isoformat()

    payload.dates = validate_and_normalize_deadlines(
        payload.dates, is_off_campus=payload.is_off_campus
    )
    primary_dt = _get_primary_deadline_dt(payload.dates)
    primary_date_str = _to_ist_date_str(primary_dt) if primary_dt is not None else None

    company_name_clean = payload.company_name.strip()
    name_key = company_name_clean.lower()
    role_title_clean = payload.role_title.strip()

    company_id: str | None = None
    company_type: str | None = None

    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            res = (
                supabase.table("companies")
                .select("id, company_type, name")
                .eq("name_key", name_key)
                .execute()
            )
            if res.data:
                company_id = res.data[0]["id"]
                company_type = res.data[0]["company_type"]
            else:
                company_type = classify_company(company_name_clean, settings=settings)
                new_company_id = str(uuid.uuid4())
                company_row = {
                    "id": new_company_id,
                    "name": company_name_clean,
                    "company_type": company_type,
                    "created_at": now_iso,
                }
                supabase.table("companies").upsert(
                    company_row, on_conflict="name_key"
                ).execute()
                fetch_res = (
                    supabase.table("companies")
                    .select("id, company_type")
                    .eq("name_key", name_key)
                    .execute()
                )
                if fetch_res.data:
                    company_id = fetch_res.data[0]["id"]
                    company_type = fetch_res.data[0]["company_type"]
                else:
                    company_id = new_company_id
        except HTTPException:
            raise
        except Exception as err:
            logger.error("Supabase company operation failed: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to resolve company record.",
            ) from err
    else:
        for cid, comp in _in_memory_companies.items():
            if comp["name"].strip().lower() == name_key:
                company_id = cid
                company_type = comp["company_type"]
                break

        if not company_id:
            company_type = classify_company(company_name_clean, settings=settings)
            company_id = str(uuid.uuid4())
            _in_memory_companies[company_id] = {
                "id": company_id,
                "name": company_name_clean,
                "name_key": name_key,
                "company_type": company_type,
                "created_at": now_iso,
            }

    # Deduplication check (only when a primary deadline exists)
    existing_drive_id: str | None = None

    if primary_date_str is not None:
        if use_supabase:
            try:
                supabase = get_service_client()
                drives_res = (
                    supabase.table("drives")
                    .select("id, role_title")
                    .eq("user_id", user_id)
                    .eq("company_id", company_id)
                    .execute()
                )
                for d_row in drives_res.data:
                    if d_row["role_title"].strip().lower() == role_title_clean.lower():
                        dates_res = (
                            supabase.table("drive_dates")
                            .select("date_iso")
                            .eq("drive_id", d_row["id"])
                            .eq("is_primary_deadline", True)
                            .execute()
                        )
                        for date_row in dates_res.data:
                            if _to_ist_date_str(date_row["date_iso"]) == primary_date_str:
                                existing_drive_id = d_row["id"]
                                break
                        if existing_drive_id:
                            break
            except Exception as err:
                logger.error("Supabase dedup check failed: %s", err)
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed during duplicate drive check.",
                ) from err
        else:
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
                            and _to_ist_date_str(date_row["date_iso"]) == primary_date_str
                        ):
                            existing_drive_id = did
                            break
                if existing_drive_id:
                    break

    if existing_drive_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "message": (
                    "A drive with matching company, role, and primary deadline already exists."
                ),
                "existing_drive_id": existing_drive_id,
            },
        )

    drive_id = str(uuid.uuid4())
    desc = payload.job_description or payload.eligibility_raw
    drive_row = {
        "id": drive_id,
        "user_id": user_id,
        "company_id": company_id,
        "role_title": role_title_clean,
        "eligibility_raw": desc,
        "job_description": desc,
        "min_cgpa": payload.min_cgpa,
        "eligible_branches": payload.eligible_branches,
        "application_link": payload.application_link,
        "ctc_display": payload.ctc_display,
        "location": payload.location,
        "work_mode": payload.work_mode,
        "status": "confirmed",
        "created_at": now_iso,
    }

    date_rows = [
        {
            "id": str(uuid.uuid4()),
            "drive_id": drive_id,
            "date_type": d.date_type,
            "label": d.label,
            "date_iso": d.date_iso.astimezone(KOLKATA_TZ).isoformat(),
            "date_raw": d.date_raw,
            "source": d.source,
            "confirmed_by_user": d.confirmed_by_user,
            "is_primary_deadline": d.is_primary_deadline,
            "created_at": now_iso,
        }
        for d in payload.dates
    ]

    app_id = str(uuid.uuid4())
    app_status = payload.application_status or "not_applied"
    app_row = {
        "id": app_id,
        "drive_id": drive_id,
        "status": app_status,
        "applied_at": now_iso if app_status != "not_applied" else None,
        "notes": None,
        "updated_at": now_iso,
    }

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
            "uploaded_at": now_iso,
        }

    if use_supabase:
        try:
            supabase = get_service_client()
            supabase.rpc(
                "create_drive_atomic",
                {
                    "p_drive": drive_row,
                    "p_dates": date_rows,
                    "p_application": app_row,
                    "p_document": doc_row,
                },
            ).execute()
        except Exception as err:
            logger.error("Failed atomic drive creation in Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save drive to database.",
            ) from err
    else:
        _in_memory_drives[drive_id] = drive_row
        _in_memory_dates.extend(date_rows)
        _in_memory_applications[drive_id] = app_row
        _in_memory_applications[app_id] = app_row
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


def build_existing_drive_summary(drive_id: str, user_id: str) -> str:
    """Construct existing_drive_summary string for PRD Section 3.2 diff prompt."""
    drive_data = None
    company_name = "Unknown Company"
    dates_data: list[dict[str, Any]] = []

    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            d_res = (
                supabase.table("drives")
                .select("*")
                .eq("id", drive_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not d_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Drive with ID {drive_id} not found.",
                )
            drive_data = d_res.data[0]
            c_res = (
                supabase.table("companies")
                .select("name")
                .eq("id", drive_data["company_id"])
                .execute()
            )
            if c_res.data:
                company_name = c_res.data[0]["name"]
            dates_res = (
                supabase.table("drive_dates")
                .select("*")
                .eq("drive_id", drive_id)
                .execute()
            )
            dates_data = dates_res.data
        except HTTPException:
            raise
        except Exception as err:
            logger.error("Failed fetching drive from Supabase for summary: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed fetching drive details.",
            ) from err
    else:
        drive_data = _in_memory_drives.get(drive_id)
        if not drive_data or drive_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Drive with ID {drive_id} not found.",
            )
        company_obj = _in_memory_companies.get(drive_data["company_id"])
        if company_obj:
            company_name = company_obj["name"]
        dates_data = [d for d in _in_memory_dates if d["drive_id"] == drive_id]

    min_cgpa_str = (
        str(drive_data.get("min_cgpa"))
        if drive_data.get("min_cgpa") is not None
        else "N/A"
    )
    branches_str = (
        ", ".join(drive_data.get("eligible_branches") or [])
        if drive_data.get("eligible_branches")
        else "N/A"
    )

    lines = [
        f"Company: {company_name}",
        f"Role Title: {drive_data.get('role_title', 'N/A')}",
        f"CTC / Salary: {drive_data.get('ctc_display') or 'N/A'}",
        f"Eligibility Raw: {drive_data.get('eligibility_raw') or 'N/A'}",
        f"Min CGPA: {min_cgpa_str}",
        f"Eligible Branches: {branches_str}",
        "Confirmed Dates on Record:",
    ]

    if not dates_data:
        lines.append("  (No dates recorded)")
    else:
        for d in dates_data:
            primary_tag = " [Primary Deadline]" if d.get("is_primary_deadline") else ""
            label_tag = f" ({d.get('label')})" if d.get("label") else ""
            lines.append(f"  - {d.get('date_type')}: {d.get('date_iso')}{label_tag}{primary_tag}")

    return "\n".join(lines)


def create_update_draft(
    drive_id: str,
    user_id: str,
    text: str | None = None,
    file_bytes: bytes | None = None,
    filename: str | None = None,
    file_content_type: str | None = None,
    reference_date_iso: str | None = None,
) -> DriveUpdateDraftResponse:
    """Generate proposed-changes UpdateResult draft without modifying database directly."""
    existing_summary = build_existing_drive_summary(drive_id, user_id)

    raw_text = text or ""
    source_type = "whatsapp_text"

    if file_bytes and filename:
        class DummyFile:
            def __init__(self, fn: str, ct: str):
                self.filename = fn
                self.content_type = ct

        dummy = DummyFile(filename, file_content_type or "application/octet-stream")
        parsed_text, detected_source = validate_and_parse_file(dummy, file_bytes)
        raw_text = parsed_text
        source_type = detected_source

    if not raw_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text or document content provided for update.",
        )

    if not reference_date_iso:
        reference_date_iso = datetime.now(KOLKATA_TZ).isoformat()

    update_result, _status_str, _err_msg = extract_update_diff(
        new_raw_text=raw_text,
        existing_drive_summary=existing_summary,
        reference_date_iso=reference_date_iso,
    )

    update_id = str(uuid.uuid4())
    _prune_update_drafts()

    _in_memory_update_drafts[update_id] = {
        "update_id": update_id,
        "drive_id": drive_id,
        "user_id": user_id,
        "raw_text": raw_text,
        "source_type": source_type,
        "file_bytes": file_bytes,
        "filename": filename,
        "content_type": file_content_type,
        "update_result": update_result,
        "_created_monotonic": time.monotonic(),
    }

    return DriveUpdateDraftResponse(
        update_id=update_id,
        drive_id=drive_id,
        update_result=update_result,
        raw_text=raw_text,
        source_type=source_type,
    )


def confirm_and_merge_update(
    drive_id: str,
    update_id: str,
    user_id: str,
    payload: ConfirmUpdatePayload,
) -> ConfirmUpdateResponse:
    """Confirm and merge an update draft into the database atomically."""
    settings = get_settings()
    now_iso = datetime.now(KOLKATA_TZ).isoformat()

    _ = build_existing_drive_summary(drive_id, user_id)

    draft_info = _in_memory_update_drafts.get(update_id)
    if draft_info is not None:
        if draft_info.get("drive_id") != drive_id or draft_info.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Update draft not found for this drive.",
            )

    raw_text = payload.raw_text or (draft_info["raw_text"] if draft_info else "")
    st = payload.source_type or (
        draft_info["source_type"] if draft_info else "whatsapp_text"
    )
    summary_of_changes = payload.summary_of_changes or (
        draft_info["update_result"].summary_of_changes
        if draft_info
        else "Confirmed drive update"
    )

    update_row = {
        "id": update_id,
        "drive_id": drive_id,
        "source_type": st,
        "raw_text": raw_text,
        "summary_of_changes": summary_of_changes,
        "created_at": now_iso,
    }

    promote_primary = False
    new_date_rows: list[dict[str, Any]] = []
    for d in payload.confirmed_new_dates:
        is_primary = bool(
            d.date_type == "application_deadline"
            and d.is_primary_deadline
            and not promote_primary
        )
        if is_primary:
            promote_primary = True
        new_date_rows.append(
            {
                "id": str(uuid.uuid4()),
                "drive_id": drive_id,
                "date_type": d.date_type,
                "label": d.label,
                "date_iso": d.date_iso.astimezone(KOLKATA_TZ).isoformat(),
                "date_raw": d.date_raw,
                "source": d.source,
                "confirmed_by_user": True,
                "is_primary_deadline": is_primary,
                "created_at": now_iso,
            }
        )

    field_updates = {
        k: v
        for k, v in payload.confirmed_field_changes.items()
        if k in ALLOWED_DRIVE_FIELDS
    }

    doc_row = None
    if draft_info and draft_info.get("file_bytes") and draft_info.get("filename"):
        fn = draft_info["filename"]
        fb = draft_info["file_bytes"]
        ct = draft_info.get("content_type")
        storage_path = f"{user_id}/{drive_id}/updates/{update_id}/{fn}"

        if settings.supabase_url and settings.supabase_service_role_key:
            try:
                supabase = get_service_client()
                supabase.storage.from_("drive-documents").upload(
                    path=storage_path,
                    file=fb,
                    file_options={"content-type": ct or "application/octet-stream"},
                )
            except Exception as err:
                logger.warning("Could not upload update file to Supabase Storage: %s", err)

        doc_row = {
            "id": str(uuid.uuid4()),
            "drive_id": drive_id,
            "drive_update_id": update_id,
            "storage_path": storage_path,
            "original_filename": fn,
            "uploaded_at": now_iso,
        }

    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            supabase.rpc(
                "confirm_drive_update_atomic",
                {
                    "p_drive_id": drive_id,
                    "p_user_id": user_id,
                    "p_update": update_row,
                    "p_new_dates": new_date_rows,
                    "p_field_updates": field_updates,
                    "p_document": doc_row,
                    "p_promote_primary": promote_primary,
                },
            ).execute()
        except Exception as err:
            logger.error("Failed atomic update merge in Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to confirm drive update.",
            ) from err
    else:
        _in_memory_updates.append(update_row)
        if promote_primary:
            for existing_d in _in_memory_dates:
                if existing_d["drive_id"] == drive_id and existing_d.get("is_primary_deadline"):
                    existing_d["is_primary_deadline"] = False
        _in_memory_dates.extend(new_date_rows)
        if (
            drive_id in _in_memory_drives
            and _in_memory_drives[drive_id].get("user_id") == user_id
            and field_updates
        ):
            _in_memory_drives[drive_id].update(field_updates)
        if doc_row:
            _in_memory_documents.append(doc_row)

    # Evict draft after successful merge to release memory/file bytes
    _in_memory_update_drafts.pop(update_id, None)

    return ConfirmUpdateResponse(
        update_id=update_id,
        drive_id=drive_id,
        summary_of_changes=summary_of_changes,
        added_dates_count=len(payload.confirmed_new_dates),
        updated_fields_count=len(field_updates),
    )


def get_drive_detail(drive_id: str, user_id: str) -> DriveDetailResponse:
    """Fetch complete drive detail view (header, dates, application status)."""
    drive_data = None
    company_name = "Unknown Company"
    company_type = "unknown"
    app_status = "not_applied"
    app_id: str | None = None
    dates_data: list[dict[str, Any]] = []

    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            d_res = (
                supabase.table("drives")
                .select("*")
                .eq("id", drive_id)
                .eq("user_id", user_id)
                .execute()
            )
            if not d_res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Drive with ID {drive_id} not found.",
                )
            drive_data = d_res.data[0]
            c_res = (
                supabase.table("companies")
                .select("name, company_type")
                .eq("id", drive_data["company_id"])
                .execute()
            )
            if c_res.data:
                company_name = c_res.data[0]["name"]
                company_type = c_res.data[0].get("company_type", "unknown")

            app_res = (
                supabase.table("applications")
                .select("id, status")
                .eq("drive_id", drive_id)
                .execute()
            )
            if app_res.data:
                app_status = app_res.data[0].get("status", "not_applied")
                app_id = app_res.data[0].get("id")

            dates_res = (
                supabase.table("drive_dates")
                .select("*")
                .eq("drive_id", drive_id)
                .execute()
            )
            dates_data = dates_res.data
        except HTTPException:
            raise
        except Exception as err:
            logger.error("Failed fetching drive detail from Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed fetching drive details.",
            ) from err
    else:
        drive_data = _in_memory_drives.get(drive_id)
        if not drive_data or drive_data.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Drive with ID {drive_id} not found.",
            )
        comp_obj = _in_memory_companies.get(drive_data["company_id"])
        if comp_obj:
            company_name = comp_obj["name"]
            company_type = comp_obj.get("company_type", "unknown")

        app_obj = _in_memory_applications.get(drive_id)
        if app_obj:
            app_status = app_obj.get("status", "not_applied")
            app_id = app_obj.get("id")

        dates_data = [d for d in _in_memory_dates if d["drive_id"] == drive_id]

    dates_models = []
    for d in dates_data:
        dtype = d.get("date_type", "other")
        if dtype not in _VALID_DATE_TYPES:
            dtype = "other"
        src = d.get("source")
        if src not in ("ai_suggested", "user_added"):
            src = "user_added"
        raw_iso = d.get("date_iso") or datetime.now(KOLKATA_TZ).isoformat()
        parsed_dt = datetime.fromisoformat(str(raw_iso))
        if parsed_dt.tzinfo is None:
            parsed_dt = parsed_dt.replace(tzinfo=KOLKATA_TZ)
        dates_models.append(
            DriveDateSaved(
                id=str(d.get("id") or uuid.uuid4()),
                date_type=dtype,
                label=d.get("label"),
                date_iso=parsed_dt,
                date_raw=d.get("date_raw"),
                source=src,
                confirmed_by_user=bool(d.get("confirmed_by_user", True)),
                is_primary_deadline=bool(d.get("is_primary_deadline", False)),
            )
        )

    branches = drive_data.get("eligible_branches")
    if isinstance(branches, str):
        try:
            branches = json.loads(branches)
        except Exception:
            branches = [branches]
    elif not isinstance(branches, list):
        branches = []

    desc_val = drive_data.get("job_description") or drive_data.get("eligibility_raw")
    return DriveDetailResponse(
        id=drive_id,
        company_id=str(drive_data.get("company_id", "")),
        company_name=company_name,
        company_type=company_type,
        role_title=drive_data.get("role_title", "Position"),
        eligibility_raw=desc_val,
        job_description=desc_val,
        min_cgpa=float(drive_data["min_cgpa"]) if drive_data.get("min_cgpa") is not None else None,
        eligible_branches=branches,
        application_link=drive_data.get("application_link"),
        ctc_display=drive_data.get("ctc_display"),
        location=drive_data.get("location"),
        work_mode=drive_data.get("work_mode"),
        status=drive_data.get("status", "confirmed"),
        application_status=app_status,
        application_id=app_id,
        created_at=str(drive_data.get("created_at") or datetime.now(KOLKATA_TZ).isoformat()),
        dates=dates_models,
    )


def get_drive_timeline(drive_id: str, user_id: str) -> DriveTimelineResponse:
    """Fetch chronological timeline combining initial capture and all drive_updates."""
    drive_detail = get_drive_detail(drive_id, user_id)

    initial_event = TimelineEvent(
        id="initial",
        event_type="initial_capture",
        source_type="whatsapp_text",
        summary_of_changes="Initial capture",
        created_at=drive_detail.created_at,
    )

    update_events: list[TimelineEvent] = []
    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            res = (
                supabase.table("drive_updates")
                .select("*")
                .eq("drive_id", drive_id)
                .order("created_at", desc=False)
                .execute()
            )
            for row in res.data:
                update_events.append(
                    TimelineEvent(
                        id=row["id"],
                        event_type="update",
                        source_type=row.get("source_type", "whatsapp_text"),
                        summary_of_changes=row.get("summary_of_changes", "Drive update"),
                        raw_text=row.get("raw_text"),
                        created_at=row.get("created_at", datetime.now(KOLKATA_TZ).isoformat()),
                    )
                )
        except Exception as err:
            logger.error("Failed fetching timeline from Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed fetching drive timeline.",
            ) from err
    else:
        mem_updates = [u for u in _in_memory_updates if u["drive_id"] == drive_id]
        mem_updates.sort(key=lambda u: u.get("created_at", ""))
        for u in mem_updates:
            update_events.append(
                TimelineEvent(
                    id=u["id"],
                    event_type="update",
                    source_type=u.get("source_type", "whatsapp_text"),
                    summary_of_changes=u.get("summary_of_changes", "Drive update"),
                    raw_text=u.get("raw_text"),
                    created_at=u.get("created_at", datetime.now(KOLKATA_TZ).isoformat()),
                )
            )

    full_timeline = [initial_event, *update_events]
    full_timeline.sort(key=lambda e: e.created_at)

    return DriveTimelineResponse(
        drive_id=drive_id,
        timeline=full_timeline,
    )


def get_drive_documents(drive_id: str, user_id: str) -> DriveDocumentsResponse:
    """Fetch list of all drive_documents with 5-minute signed download URLs."""
    _ = get_drive_detail(drive_id, user_id)

    doc_rows: list[dict[str, Any]] = []
    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            res = (
                supabase.table("drive_documents")
                .select("*")
                .eq("drive_id", drive_id)
                .order("uploaded_at", desc=False)
                .execute()
            )
            doc_rows = res.data
        except Exception as err:
            logger.error("Failed fetching documents from Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed fetching drive documents.",
            ) from err
    else:
        doc_rows = [d for d in _in_memory_documents if d["drive_id"] == drive_id]

    doc_items: list[DocumentItem] = []

    for d in doc_rows:
        doc_id = d.get("id", str(uuid.uuid4()))
        storage_path = d.get("storage_path", "")
        filename = d.get("original_filename", "document.pdf")
        uploaded_at = d.get("uploaded_at", datetime.now(KOLKATA_TZ).isoformat())
        update_id = d.get("drive_update_id")

        download_url = generate_signed_storage_url(
            storage_path=storage_path,
            doc_id=doc_id,
            expires_in_seconds=300,
        )

        update_summary: str | None = None
        if update_id:
            for u in _in_memory_updates:
                if u["id"] == update_id:
                    update_summary = u.get("summary_of_changes")
                    break

        doc_items.append(
            DocumentItem(
                id=doc_id,
                drive_id=drive_id,
                drive_update_id=update_id,
                original_filename=filename,
                storage_path=storage_path,
                uploaded_at=uploaded_at,
                download_url=download_url,
                update_summary=update_summary,
            )
        )

    return DriveDocumentsResponse(
        drive_id=drive_id,
        documents=doc_items,
    )


def list_drives_for_dashboard(user_id: str) -> DriveListResponse:
    """Fetch card list of all drives for main dashboard with IST days-left calculations."""
    now_dt = datetime.now(KOLKATA_TZ)
    now_date = now_dt.date()

    drives_data: list[dict[str, Any]] = []
    companies_map: dict[str, dict[str, Any]] = {}
    dates_data: list[dict[str, Any]] = []
    apps_data: list[dict[str, Any]] = []

    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            d_res = supabase.table("drives").select("*").eq("user_id", user_id).execute()
            drives_data = d_res.data
            if drives_data:
                comp_ids = list({d["company_id"] for d in drives_data})
                c_res = supabase.table("companies").select("*").in_("id", comp_ids).execute()
                for c in c_res.data:
                    companies_map[c["id"]] = c

                drive_ids = [d["id"] for d in drives_data]
                dates_res = (
                    supabase.table("drive_dates")
                    .select("*")
                    .in_("drive_id", drive_ids)
                    .execute()
                )
                dates_data = dates_res.data

                apps_res = (
                    supabase.table("applications")
                    .select("*")
                    .in_("drive_id", drive_ids)
                    .execute()
                )
                apps_data = apps_res.data
        except Exception as err:
            logger.error("Failed fetching drives for dashboard from Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed loading dashboard drives.",
            ) from err
    else:
        drives_data = [d for d in _in_memory_drives.values() if d["user_id"] == user_id]
        companies_map = _in_memory_companies
        dates_data = _in_memory_dates
        apps_data = list(_in_memory_applications.values())

    cards: list[DriveCardResponse] = []

    for d in drives_data:
        did = d["id"]
        comp = companies_map.get(d["company_id"], {})
        cname = comp.get("name", "Unknown Company")
        ctype = comp.get("company_type", "unknown")

        app_info = next((a for a in apps_data if a["drive_id"] == did), {})
        app_id = app_info.get("id", str(uuid.uuid4()))
        app_status = app_info.get("status", "not_applied")
        applied_at = app_info.get("applied_at")

        drive_dates = [dt for dt in dates_data if dt["drive_id"] == did]
        primary_dt = next((dt for dt in drive_dates if dt.get("is_primary_deadline")), None)
        if not primary_dt:
            primary_dt = next(
                (dt for dt in drive_dates if dt.get("date_type") == "application_deadline"),
                None,
            )
        if not primary_dt and drive_dates:
            primary_dt = drive_dates[0]

        if primary_dt:
            primary_iso: str | None = primary_dt["date_iso"]
            try:
                deadline_dt = datetime.fromisoformat(str(primary_iso))
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=KOLKATA_TZ)
                deadline_date = deadline_dt.astimezone(KOLKATA_TZ).date()
                days_left: int | None = (deadline_date - now_date).days
                is_overdue = deadline_date < now_date
            except Exception:
                days_left = 0
                is_overdue = False
        else:
            primary_iso = None
            days_left = None
            is_overdue = False

        cards.append(
            DriveCardResponse(
                id=did,
                company_id=d["company_id"],
                company_name=cname,
                company_type=ctype,
                role_title=d.get("role_title", "Position"),
                application_id=app_id,
                application_status=app_status,
                applied_at=applied_at,
                primary_deadline_iso=primary_iso,
                days_left=days_left,
                is_overdue=is_overdue,
                created_at=d.get("created_at", now_dt.isoformat()),
                ctc_display=d.get("ctc_display"),
                location=d.get("location"),
                work_mode=d.get("work_mode"),
            )
        )

    active_pipeline_statuses = {"applied", "oa", "interview"}

    active_cards = [
        c for c in cards
        if not c.is_overdue or c.application_status in active_pipeline_statuses
    ]
    overdue_cards = [
        c for c in cards
        if c.is_overdue and c.application_status not in active_pipeline_statuses
    ]

    active_cards.sort(
        key=lambda c: (
            c.days_left is None,
            c.days_left if c.days_left is not None else 0,
            c.primary_deadline_iso or "",
        )
    )
    overdue_cards.sort(
        key=lambda c: (
            c.days_left is None,
            c.days_left if c.days_left is not None else 0,
            c.primary_deadline_iso or "",
        )
    )

    return DriveListResponse(drives=[*active_cards, *overdue_cards])


def update_application_status(
    application_id: str,
    new_status: str,
    notes: str | None,
    user_id: str,
) -> ApplicationResponse:
    """Update application status. Sets applied_at once if moving to 'applied' for the first time."""
    now_iso = datetime.now(KOLKATA_TZ).isoformat()

    app_row: dict[str, Any] | None = None
    use_supabase = _use_supabase()

    if use_supabase:
        try:
            supabase = get_service_client()
            res = (
                supabase.table("applications")
                .select("*")
                .eq("id", application_id)
                .execute()
            )
            if not res.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application record with ID {application_id} not found.",
                )
            candidate_app = res.data[0]
            drive_check = (
                supabase.table("drives")
                .select("id")
                .eq("id", candidate_app.get("drive_id", ""))
                .eq("user_id", user_id)
                .execute()
            )
            if not drive_check.data:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Application record with ID {application_id} not found.",
                )
            app_row = candidate_app
        except HTTPException:
            raise
        except Exception as err:
            logger.error("Failed fetching application from Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed fetching application record.",
            ) from err
    else:
        candidate_app = _in_memory_applications.get(application_id)
        if not candidate_app:
            for a in _in_memory_applications.values():
                if a.get("id") == application_id:
                    candidate_app = a
                    break

        if not candidate_app:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application record with ID {application_id} not found.",
            )

        owning_drive = _in_memory_drives.get(candidate_app.get("drive_id", ""))
        if not owning_drive or owning_drive.get("user_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Application record with ID {application_id} not found.",
            )

        app_row = candidate_app

    existing_applied_at = app_row.get("applied_at")

    if new_status == "applied" and not existing_applied_at:
        applied_at = now_iso
    else:
        applied_at = existing_applied_at

    updates = {
        "status": new_status,
        "applied_at": applied_at,
        "updated_at": now_iso,
    }
    if notes is not None:
        updates["notes"] = notes

    if use_supabase:
        try:
            supabase = get_service_client()
            supabase.table("applications").update(updates).eq("id", application_id).execute()
        except Exception as err:
            logger.error("Failed updating application in Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed updating application status.",
            ) from err
    else:
        app_row.update(updates)
        _in_memory_applications[application_id] = app_row
        if "drive_id" in app_row:
            _in_memory_applications[app_row["drive_id"]] = app_row

    return ApplicationResponse(
        id=application_id,
        drive_id=app_row.get("drive_id", ""),
        status=new_status,
        applied_at=applied_at,
        notes=app_row.get("notes"),
        updated_at=now_iso,
    )


def update_drive(
    drive_id: str,
    user_id: str,
    payload: UpdateDriveRequest,
) -> DriveDetailResponse:
    """Directly update drive details (CTC, role, eligibility, links) and return updated detail."""
    _ = get_drive_detail(drive_id=drive_id, user_id=user_id)

    update_data = payload.model_dump(exclude_unset=True)

    if "job_description" in update_data and "eligibility_raw" not in update_data:
        update_data["eligibility_raw"] = update_data["job_description"]
    elif "eligibility_raw" in update_data and "job_description" not in update_data:
        update_data["job_description"] = update_data["eligibility_raw"]

    use_supabase = _use_supabase()
    if use_supabase:
        try:
            supabase = get_service_client()
            filtered_fields = {
                k: v for k, v in update_data.items()
                if k in ALLOWED_DRIVE_FIELDS
            }
            if filtered_fields:
                (
                    supabase.table("drives")
                    .update(filtered_fields)
                    .eq("id", drive_id)
                    .eq("user_id", user_id)
                    .execute()
                )
        except Exception as err:
            logger.error("Failed updating drive in Supabase: %s", err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed updating drive details.",
            ) from err
    else:
        if drive_id in _in_memory_drives and _in_memory_drives[drive_id].get("user_id") == user_id:
            for k, v in update_data.items():
                if k in ALLOWED_DRIVE_FIELDS:
                    _in_memory_drives[drive_id][k] = v

    return get_drive_detail(drive_id=drive_id, user_id=user_id)


def _delete_drive_storage_files(supabase: Any, drive_id: str) -> None:
    """Best-effort removal of uploaded documents for a drive from Supabase Storage."""
    try:
        docs_res = (
            supabase.table("drive_documents")
            .select("storage_path")
            .eq("drive_id", drive_id)
            .execute()
        )
        paths = [row["storage_path"] for row in (docs_res.data or []) if row.get("storage_path")]
        if paths:
            supabase.storage.from_("drive-documents").remove(paths)
    except Exception as err:
        logger.warning("Failed cleaning up storage files for drive %s: %s", drive_id, err)


def _delete_in_memory_drive(drive_id: str) -> None:
    """Remove all in-memory records associated with a deleted drive."""
    _in_memory_drives.pop(drive_id, None)
    _in_memory_dates[:] = [d for d in _in_memory_dates if d.get("drive_id") != drive_id]
    _in_memory_documents[:] = [d for d in _in_memory_documents if d.get("drive_id") != drive_id]
    _in_memory_updates[:] = [u for u in _in_memory_updates if u.get("drive_id") != drive_id]
    app_row = _in_memory_applications.pop(drive_id, None)
    if app_row and app_row.get("id"):
        _in_memory_applications.pop(app_row["id"], None)


def delete_drive(drive_id: str, user_id: str) -> None:
    """Permanently delete a drive owned by user_id and its associated files."""
    _ = get_drive_detail(drive_id=drive_id, user_id=user_id)

    use_supabase = _use_supabase()
    if use_supabase:
        try:
            supabase = get_service_client()
            _delete_drive_storage_files(supabase, drive_id)
            (
                supabase.table("drives")
                .delete()
                .eq("id", drive_id)
                .eq("user_id", user_id)
                .execute()
            )
        except HTTPException:
            raise
        except Exception as err:
            logger.error("Failed deleting drive %s in Supabase: %s", drive_id, err)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed deleting placement drive.",
            ) from err
    else:
        _delete_in_memory_drive(drive_id)


def bulk_delete_drives(drive_ids: list[str], user_id: str) -> DeleteDriveResponse:
    """Delete multiple drives owned by user_id, skipping any not found or not owned."""
    unique_ids = list(dict.fromkeys(drive_ids))
    deleted_ids: list[str] = []

    for did in unique_ids:
        try:
            delete_drive(drive_id=did, user_id=user_id)
            deleted_ids.append(did)
        except HTTPException as err:
            if err.status_code == status.HTTP_404_NOT_FOUND:
                continue
            raise

    return DeleteDriveResponse(deleted_count=len(deleted_ids), deleted_ids=deleted_ids)
