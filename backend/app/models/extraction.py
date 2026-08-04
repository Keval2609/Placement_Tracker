"""Pydantic schemas for AI placement data extraction (PRD Section 3.3)."""

from typing import Literal

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
