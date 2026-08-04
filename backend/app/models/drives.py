"""Pydantic schemas for POST /drives confirmed-save endpoint."""

from typing import Literal

from pydantic import BaseModel, Field


class ConfirmedDateItem(BaseModel):
    """Represents a date entry submitted during confirmed drive save."""

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
