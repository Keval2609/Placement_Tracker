"""FastAPI router for POST /drives confirmed-save endpoint."""

import json
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse

from app.dependencies import get_current_user_id
from app.models.drives import CreateDriveRequest, DriveResponse
from app.services.drive_service import save_drive

router = APIRouter(prefix="/drives", tags=["Drives"])


@router.post(
    "",
    response_model=DriveResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create confirmed drive record",
    description=(
        "Accepts confirmed drive details and optional attached document. "
        "Server-side re-validates that at least one application_deadline is confirmed_by_user=true (422). "
        "Checks for existing duplicate drive on (company_id, role_title, primary_deadline_date) (409). "
        "Persists data across companies, drives, drive_dates, applications, and drive_documents."
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
            # Fallback to extracting individual form fields if payload JSON string not sent
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
        # Format 409 response nicely with existing_drive_id at root if detail dict present
        if getattr(err, "status_code", None) == 409:
            detail = getattr(err, "detail", {})
            if isinstance(detail, dict):
                return JSONResponse(
                    status_code=status.HTTP_409_CONFLICT,
                    content={
                        "detail": detail.get(
                            "message",
                            "A drive with matching company, role, and primary deadline already exists.",
                        ),
                        "existing_drive_id": detail.get("existing_drive_id"),
                    },
                )
        raise err
