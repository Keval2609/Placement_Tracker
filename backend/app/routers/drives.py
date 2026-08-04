"""FastAPI router for /drives endpoints (drive creation and updates)."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user_id
from app.models.drives import (
    ConfirmUpdatePayload,
    ConfirmUpdateResponse,
    CreateDriveRequest,
    DriveResponse,
)
from app.models.extraction import DriveUpdateDraftResponse
from app.services.drive_service import (
    confirm_and_merge_update,
    create_update_draft,
    save_drive,
)

router = APIRouter(prefix="/drives", tags=["Drives"])


@router.post(
    "",
    response_model=DriveResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create confirmed drive record",
    description=(
        "Accepts confirmed drive details and optional attached document. "
        "Server-side re-validates that at least one application_deadline is confirmed (422). "
        "Checks for existing duplicate drive on (company_id, role_title, primary_deadline) (409). "
        "Persists data across companies, drives, drive_dates, applications, drive_documents."
    ),
)
async def create_drive(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> DriveResponse:
    content_type_header = request.headers.get("content-type", "")

    file_bytes: bytes | None = None
    filename: str | None = None
    file_content_type: str | None = None
    payload: CreateDriveRequest

    if "multipart/form-data" in content_type_header.lower():
        form = await request.form()
        payload_raw = form.get("payload")
        if not payload_raw or not isinstance(payload_raw, str):
            payload_dict = {
                "company_name": form.get("company_name"),
                "role_title": form.get("role_title"),
                "eligibility_raw": form.get("eligibility_raw"),
                "min_cgpa": float(form.get("min_cgpa")) if form.get("min_cgpa") else None,
                "application_link": form.get("application_link"),
            }
            dates_raw = form.get("dates")
            if dates_raw and isinstance(dates_raw, str):
                payload_dict["dates"] = json.loads(dates_raw)
            payload = CreateDriveRequest.model_validate(payload_dict)
        else:
            payload = CreateDriveRequest.model_validate_json(payload_raw)

        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "read"):
            filename = getattr(uploaded_file, "filename", "document.pdf")
            file_content_type = getattr(uploaded_file, "content_type", "application/octet-stream")
            file_bytes = await uploaded_file.read()
    else:
        body_bytes = await request.body()
        payload = CreateDriveRequest.model_validate_json(body_bytes)

    try:
        response = save_drive(
            payload=payload,
            user_id=user_id,
            file_bytes=file_bytes,
            filename=filename,
            content_type=file_content_type,
        )
        return response
    except Exception as err:
        if getattr(err, "status_code", None) == 409:
            detail = getattr(err, "detail", {})
            if isinstance(detail, dict):
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "detail": detail.get(
                            "message",
                            "Drive with matching company, role, and deadline already exists.",
                        ),
                        "existing_drive_id": detail.get("existing_drive_id"),
                    },
                )
        raise err


@router.post(
    "/{id}/updates",
    response_model=DriveUpdateDraftResponse,
    status_code=status.HTTP_200_OK,
    summary="Propose drive update diff (Add Update)",
    description=(
        "Accepts new follow-up text or document for an existing drive. "
        "Builds existing_drive_summary and runs LLM Diff Prompt to extract new/changed fields. "
        "Returns proposed UpdateResult draft WITHOUT persisting to database directly."
    ),
)
async def propose_drive_update(
    id: str,
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> DriveUpdateDraftResponse:
    content_type_header = request.headers.get("content-type", "")

    file_bytes: bytes | None = None
    filename: str | None = None
    file_content_type: str | None = None
    text: str | None = None

    if "multipart/form-data" in content_type_header.lower():
        form = await request.form()
        text = form.get("text") if isinstance(form.get("text"), str) else None
        uploaded_file = form.get("file")
        if uploaded_file and hasattr(uploaded_file, "read"):
            filename = getattr(uploaded_file, "filename", "update_document.pdf")
            file_content_type = getattr(uploaded_file, "content_type", "application/octet-stream")
            file_bytes = await uploaded_file.read()
    else:
        body_bytes = await request.body()
        if body_bytes:
            data = json.loads(body_bytes.decode("utf-8"))
            text = data.get("text")

    return create_update_draft(
        drive_id=id,
        user_id=user_id,
        text=text,
        file_bytes=file_bytes,
        filename=filename,
        file_content_type=file_content_type,
    )


@router.patch(
    "/{id}/updates/{update_id}/confirm",
    response_model=ConfirmUpdateResponse,
    status_code=status.HTTP_200_OK,
    summary="Confirm and merge drive update",
    description=(
        "Accepts confirmed new dates and field changes for an update draft. "
        "Writes drive_updates record, inserts new drive_dates rows, applies field_changes, "
        "and links uploaded files to drive_documents."
    ),
)
async def confirm_drive_update(
    id: str,
    update_id: str,
    payload: ConfirmUpdatePayload,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> ConfirmUpdateResponse:
    return confirm_and_merge_update(
        drive_id=id,
        update_id=update_id,
        user_id=user_id,
        payload=payload,
    )
