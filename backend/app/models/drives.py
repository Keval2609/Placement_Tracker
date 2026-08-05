"""Pydantic schemas for POST /drives confirmed-save and update endpoints."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class ConfirmedDateItem(BaseModel):
    """Represents a date entry submitted during confirmed drive save or update."""

    date_type: Literal[
        "application_deadline",
        "oa",
        "interview",
        "ppt",
        "result",
        "joining",
        "other",
    ]
    label: str | None = None
    date_iso: str
    date_raw: str | None = None
    source: Literal["ai_suggested", "user_added"] = "user_added"
    confirmed_by_user: bool = False
    is_primary_deadline: bool = False


class CreateDriveRequest(BaseModel):
    """Payload sent by client when confirming and saving a drive."""

    company_name: str
    role_title: str
    eligibility_raw: str | None = None
    min_cgpa: float | None = None
    eligible_branches: list[str] = Field(default_factory=list)
    application_link: str | None = None
    dates: list[ConfirmedDateItem] = Field(default_factory=list)


class DriveResponse(BaseModel):
    """Response returned upon successful creation of a drive."""

    id: str
    company_id: str
    company_name: str
    company_type: str
    role_title: str
    status: str = "confirmed"
    message: str = "Drive created successfully"


class DuplicateDriveResponse(BaseModel):
    """Response returned (HTTP 409) when a matching drive already exists."""

    detail: str
    existing_drive_id: str


class ConfirmUpdatePayload(BaseModel):
    """Payload sent by client to confirm and merge an update draft into an existing drive."""

    confirmed_new_dates: list[ConfirmedDateItem] = Field(default_factory=list)
    confirmed_field_changes: dict[str, Any] = Field(default_factory=dict)
    summary_of_changes: str | None = None
    raw_text: str | None = None
    source_type: Literal["whatsapp_text", "pdf", "docx"] = "whatsapp_text"


class ConfirmUpdateResponse(BaseModel):
    """Response returned upon successful confirmation of an update."""

    update_id: str
    drive_id: str
    message: str = "Drive update merged successfully"
    summary_of_changes: str
    added_dates_count: int
    updated_fields_count: int


class DriveDateSaved(ConfirmedDateItem):
    """Saved drive date record with ID."""

    id: str


class DriveDetailResponse(BaseModel):
    """Complete drive detail view response for GET /drives/{id}."""

    id: str
    company_id: str
    company_name: str
    company_type: str
    role_title: str
    eligibility_raw: str | None = None
    min_cgpa: float | None = None
    eligible_branches: list[str] = Field(default_factory=list)
    application_link: str | None = None
    status: str = "confirmed"
    application_status: str = "not_applied"
    created_at: str
    dates: list[DriveDateSaved] = Field(default_factory=list)


class TimelineEvent(BaseModel):
    """Represents a single event in the drive's chronological timeline."""

    id: str
    event_type: Literal["initial_capture", "update"]
    source_type: Literal["whatsapp_text", "pdf", "docx"] = "whatsapp_text"
    summary_of_changes: str
    raw_text: str | None = None
    created_at: str


class DriveTimelineResponse(BaseModel):
    """Chronological timeline response for GET /drives/{id}/timeline."""

    drive_id: str
    timeline: list[TimelineEvent] = Field(default_factory=list)


class DocumentItem(BaseModel):
    """Represents an attached document for GET /drives/{id}/documents."""

    id: str
    drive_id: str
    drive_update_id: str | None = None
    original_filename: str
    storage_path: str
    uploaded_at: str
    download_url: str
    update_summary: str | None = None


class DriveDocumentsResponse(BaseModel):
    """Document list response for GET /drives/{id}/documents."""

    drive_id: str
    documents: list[DocumentItem] = Field(default_factory=list)
