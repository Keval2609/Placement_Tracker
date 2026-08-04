"""Pydantic schemas for AI placement data extraction (PRD Section 3.3)."""

from typing import Any, Literal

from pydantic import BaseModel, Field


class DetectedDate(BaseModel):
    """Represents a date mentioned in a placement circular or message."""

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
    date_raw: str


class DrivePosting(BaseModel):
    """Represents a single job or internship posting extracted from raw content."""

    company_name: str
    role_title: str
    eligibility_raw: str | None = None
    min_cgpa: float | None = None
    eligible_branches: list[str] = Field(default_factory=list)
    application_link: str | None = None
    dates: list[DetectedDate] = Field(default_factory=list)


class ExtractionResult(BaseModel):
    """Wrapper output schema for batch postings extraction."""

    postings: list[DrivePosting] = Field(default_factory=list)


class IngestTextRequest(BaseModel):
    """Request payload for text-based ingestion endpoint."""

    text: str


class UpdateResult(BaseModel):
    """Pydantic schema for diff extraction output (PRD Section 3.3)."""

    new_dates: list[DetectedDate] = Field(default_factory=list)
    field_changes: dict[str, Any] = Field(default_factory=dict)
    summary_of_changes: str


class DriveUpdateDraftResponse(BaseModel):
    """Draft proposed-changes returned by POST /drives/{id}/updates."""

    update_id: str
    drive_id: str
    update_result: UpdateResult
    raw_text: str | None = None
    source_type: str = "whatsapp_text"
