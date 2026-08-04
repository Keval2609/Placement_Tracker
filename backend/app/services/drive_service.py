"""Drive persistence and update service.

Handles:
1. Re-validation of confirmed application deadline (HTTP 422 if missing).
2. Setting is_primary_deadline=true on exactly one application_deadline row.
3. Company lookup & classification (static lookup + LLM fallback).
4. Deduplication check on (company_id, role_title, primary_deadline_date) -> HTTP 409.
5. Persistence to `companies`, `drives`, `drive_dates`, `applications`, and `drive_documents`.
6. Uploading attached files to Supabase Storage bucket (`drive-documents`).
7. "Add Update" flow: summary builder, diff extraction, update draft creation
   (`POST /drives/{id}/updates`), and confirmed update merge
   (`PATCH /drives/{id}/updates/{update_id}/confirm`).
"""

import logging
import uuid
from typing import Any

from fastapi import HTTPException, status

from app.config import get_settings
from app.models.drives import (
    ConfirmedDateItem,
    ConfirmUpdatePayload,
    ConfirmUpdateResponse,
    CreateDriveRequest,
    DriveResponse,
)
from app.models.extraction import DriveUpdateDraftResponse
from app.services.company_classifier import classify_company
from app.services.llm import extract_update_diff
from app.services.parsers import validate_and_parse_file
from app.supabase_client import get_service_client

logger = logging.getLogger(__name__)

# Fallback in-memory storage for test/offline execution when Supabase is unconfigured
_in_memory_companies: dict[str, dict[str, Any]] = {}
_in_memory_drives: dict[str, dict[str, Any]] = {}
_in_memory_dates: list[dict[str, Any]] = []
_in_memory_applications: dict[str, dict[str, Any]] = {}
_in_memory_documents: list[dict[str, Any]] = []
_in_memory_update_drafts: dict[str, dict[str, Any]] = {}

ALLOWED_DRIVE_FIELDS = {
    "min_cgpa",
    "eligibility_raw",
    "role_title",
    "application_link",
    "eligible_branches",
}


def clear_in_memory_db() -> None:
    """Clear in-memory fallback stores (useful for testing)."""
    _in_memory_companies.clear()
    _in_memory_drives.clear()
    _in_memory_dates.clear()
    _in_memory_applications.clear()
    _in_memory_documents.clear()
    _in_memory_update_drafts.clear()


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
    """Save confirmed drive data and attached document."""
    settings = get_settings()

    payload.dates = validate_and_normalize_deadlines(payload.dates)
    primary_date_iso = _get_primary_deadline_date_iso(payload.dates)
    primary_date_str = primary_date_iso.split("T")[0]

    company_name_clean = payload.company_name.strip()
    role_title_clean = payload.role_title.strip()

    company_id: str | None = None
    company_type: str | None = None

    use_supabase = bool(settings.supabase_url and settings.supabase_service_role_key)

    if use_supabase:
        try:
            supabase = get_service_client()
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

    # Deduplication check
    existing_drive_id: str | None = None

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
                        d_iso = date_row["date_iso"]
                        if d_iso.split("T")[0] == primary_date_str:
                            existing_drive_id = d_row["id"]
                            break
                    if existing_drive_id:
                        break
        except Exception as err:
            logger.warning("Supabase dedup check failed: %s", err)

    if not existing_drive_id:
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
                "message": (
                    "A drive with matching company, role, and primary deadline already exists."
                ),
                "existing_drive_id": existing_drive_id,
            },
        )

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

    app_row = {
        "id": str(uuid.uuid4()),
        "drive_id": drive_id,
        "status": "not_applied",
        "notes": payload.application_link if payload.application_link else None,
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
        }

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


def build_existing_drive_summary(drive_id: str, user_id: str) -> str:
    """Construct existing_drive_summary string for PRD Section 3.2 diff prompt."""
    settings = get_settings()
    drive_data = None
    company_name = "Unknown Company"
    dates_data = []

    use_supabase = bool(settings.supabase_url and settings.supabase_service_role_key)

    if use_supabase:
        try:
            supabase = get_service_client()
            d_res = supabase.table("drives").select("*").eq("id", drive_id).execute()
            if d_res.data:
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
        except Exception as err:
            logger.warning("Failed fetching drive from Supabase for summary: %s", err)
            use_supabase = False

    if not drive_data:
        drive_data = _in_memory_drives.get(drive_id)
        if not drive_data:
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
        import zoneinfo
        from datetime import datetime
        KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")
        reference_date_iso = datetime.now(KOLKATA_TZ).isoformat()

    update_result, status_str, err_msg = extract_update_diff(
        new_raw_text=raw_text,
        existing_drive_summary=existing_summary,
        reference_date_iso=reference_date_iso,
    )

    update_id = str(uuid.uuid4())

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
    """Confirm and merge an update draft into the database."""
    settings = get_settings()

    # Ensure drive exists
    _ = build_existing_drive_summary(drive_id, user_id)

    draft_info = _in_memory_update_drafts.get(update_id)

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
    }

    new_date_rows = [
        {
            "id": str(uuid.uuid4()),
            "drive_id": drive_id,
            "date_type": d.date_type,
            "label": d.label,
            "date_iso": d.date_iso,
            "date_raw": d.date_raw,
            "source": d.source,
            "confirmed_by_user": True,
            "is_primary_deadline": False,
        }
        for d in payload.confirmed_new_dates
    ]

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
        }

    use_supabase = bool(settings.supabase_url and settings.supabase_service_role_key)
    written_to_supabase = False

    if use_supabase:
        try:
            supabase = get_service_client()
            supabase.table("drive_updates").insert(update_row).execute()
            if new_date_rows:
                supabase.table("drive_dates").insert(new_date_rows).execute()
            if payload.confirmed_field_changes:
                field_updates = {
                    k: v
                    for k, v in payload.confirmed_field_changes.items()
                    if k in ALLOWED_DRIVE_FIELDS
                }
                if field_updates:
                    supabase.table("drives").update(field_updates).eq("id", drive_id).execute()
            if doc_row:
                supabase.table("drive_documents").insert(doc_row).execute()
            written_to_supabase = True
        except Exception as err:
            logger.warning("Failed writing update to Supabase: %s", err)

    if not written_to_supabase:
        _in_memory_dates.extend(new_date_rows)
        if drive_id in _in_memory_drives and payload.confirmed_field_changes:
            for k, v in payload.confirmed_field_changes.items():
                if k in ALLOWED_DRIVE_FIELDS:
                    _in_memory_drives[drive_id][k] = v
        if doc_row:
            _in_memory_documents.append(doc_row)

    return ConfirmUpdateResponse(
        update_id=update_id,
        drive_id=drive_id,
        summary_of_changes=summary_of_changes,
        added_dates_count=len(payload.confirmed_new_dates),
        updated_fields_count=len(payload.confirmed_field_changes),
    )
