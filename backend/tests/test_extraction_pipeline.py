"""Automated unit and integration tests for AI extraction pipeline (PRD 3.1 & 3.3)."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.main import app
from app.models.extraction import DetectedDate, DrivePosting, ExtractionResult
from app.services.llm import extract_with_retry, validate_provider_guard
from app.services.parsers import (
    MAX_FILE_SIZE_BYTES,
    validate_and_parse_file,
)

client = TestClient(app)


# ---------------------------------------------------------------------------
# 1. Pydantic Schema Tests
# ---------------------------------------------------------------------------

def test_pydantic_extraction_models() -> None:
    date_item = DetectedDate(
        date_type="application_deadline",
        label="Resume submission",
        date_iso="2026-08-10T23:59:59+05:30",
        date_raw="Apply by 10th Aug EOD",
    )
    posting = DrivePosting(
        company_name="Acme Corp",
        role_title="Software Engineer",
        eligibility_raw="7.5 CGPA and above, CSE/IT only",
        min_cgpa=7.5,
        eligible_branches=["CSE", "IT"],
        application_link="https://acme.example.com/apply",
        dates=[date_item],
    )
    result = ExtractionResult(postings=[posting])

    json_str = result.model_dump_json()
    reconstructed = ExtractionResult.model_validate_json(json_str)

    assert len(reconstructed.postings) == 1
    assert reconstructed.postings[0].company_name == "Acme Corp"
    assert reconstructed.postings[0].dates[0].date_type == "application_deadline"


# ---------------------------------------------------------------------------
# 2. PII_SAFE_PROVIDERS Guard Tests
# ---------------------------------------------------------------------------

def test_pii_safe_providers_guard() -> None:
    # Allowed providers pass without error
    validate_provider_guard("groq", contains_personal_data=True)
    validate_provider_guard("ollama", contains_personal_data=True)

    # Unauthorized provider raises ValueError
    with pytest.raises(ValueError, match="is not approved for personal data"):
        validate_provider_guard("gemini", contains_personal_data=True)

    with pytest.raises(ValueError, match="is not approved for personal data"):
        validate_provider_guard("openai", contains_personal_data=True)


# ---------------------------------------------------------------------------
# 3. Document Parsers & File Validation Tests
# ---------------------------------------------------------------------------

def test_file_size_validation() -> None:
    mock_file = MagicMock()
    mock_file.filename = "large.pdf"
    mock_file.content_type = "application/pdf"
    oversized_bytes = b"x" * (MAX_FILE_SIZE_BYTES + 100)

    with pytest.raises(HTTPException) as exc_info:
        validate_and_parse_file(mock_file, oversized_bytes)

    assert exc_info.value.status_code == 400
    assert "exceeds the 10MB limit" in exc_info.value.detail


def test_unsupported_file_type_validation() -> None:
    mock_file = MagicMock()
    mock_file.filename = "script.sh"
    mock_file.content_type = "text/x-shellscript"

    with pytest.raises(HTTPException) as exc_info:
        validate_and_parse_file(mock_file, b"echo hello")

    assert exc_info.value.status_code == 400
    assert "Unsupported file type" in exc_info.value.detail


# ---------------------------------------------------------------------------
# 4. Ingestion Endpoint /ingest/text Tests
# ---------------------------------------------------------------------------

@patch("app.routers.ingest.extract_with_retry")
@patch("app.routers.ingest.log_ingestion_attempt")
def test_ingest_text_success(mock_log: MagicMock, mock_extract: MagicMock) -> None:
    mock_result = ExtractionResult(
        postings=[
            DrivePosting(
                company_name="Google",
                role_title="SDE Intern",
                eligibility_raw="8.0 CGPA",
                min_cgpa=8.0,
                eligible_branches=["CSE", "ECE"],
                application_link="https://careers.google.com/jobs/123",
                dates=[
                    DetectedDate(
                        date_type="application_deadline",
                        label="Apply deadline",
                        date_iso="2026-08-08T23:59:59+05:30",
                        date_raw="by 8th Aug",
                    ),
                    DetectedDate(
                        date_type="oa",
                        label="Online Assessment",
                        date_iso="2026-08-12T10:00:00+05:30",
                        date_raw="OA on Aug 12 10 AM",
                    ),
                    DetectedDate(
                        date_type="interview",
                        label="Tech Interview",
                        date_iso="2026-08-18T09:00:00+05:30",
                        date_raw="Interviews from 18th Aug",
                    ),
                ],
            )
        ]
    )
    mock_extract.return_value = (mock_result, "success", None)

    whatsapp_msg = (
        "📢 *Google SDE Intern Drive 2026*\n"
        "Min CGPA: 8.0 (CSE, ECE)\n"
        "Apply by 8th Aug: https://careers.google.com/jobs/123\n"
        "OA on Aug 12 10 AM, Interviews from 18th Aug."
    )

    response = client.post("/ingest/text", json={"text": whatsapp_msg})

    assert response.status_code == 200
    data = response.json()
    assert len(data["postings"]) == 1
    posting = data["postings"][0]
    assert posting["company_name"] == "Google"
    assert len(posting["dates"]) == 3
    date_types = {d["date_type"] for d in posting["dates"]}
    assert date_types == {"application_deadline", "oa", "interview"}

    mock_log.assert_called_once_with(
        source_type="whatsapp_text",
        status="success",
        error_message=None,
    )


# ---------------------------------------------------------------------------
# 5. Ingestion Endpoint /ingest/file Tests
# ---------------------------------------------------------------------------

@patch("app.routers.ingest.validate_and_parse_file")
@patch("app.routers.ingest.extract_with_retry")
@patch("app.routers.ingest.log_ingestion_attempt")
def test_ingest_file_pdf(
    mock_log: MagicMock, mock_extract: MagicMock, mock_parse: MagicMock
) -> None:
    mock_parse.return_value = ("Parsed PDF Content | Company: Microsoft", "pdf")
    mock_result = ExtractionResult(
        postings=[
            DrivePosting(
                company_name="Microsoft",
                role_title="Software Engineer",
                dates=[
                    DetectedDate(
                        date_type="application_deadline",
                        date_iso="2026-08-15T23:59:59+05:30",
                        date_raw="15th August",
                    )
                ],
            )
        ]
    )
    mock_extract.return_value = (mock_result, "success", None)

    file_bytes = b"%PDF-1.4 dummy pdf bytes"
    files = {"file": ("drive_circular.pdf", file_bytes, "application_pdf")}

    response = client.post("/ingest/file", files=files)

    assert response.status_code == 200
    data = response.json()
    assert data["postings"][0]["company_name"] == "Microsoft"
    mock_log.assert_called_once_with(
        source_type="pdf",
        status="success",
        error_message=None,
    )


# ---------------------------------------------------------------------------
# 6. Retry & Fallback Degradation Tests (Groq key killed / Provider error)
# ---------------------------------------------------------------------------

@patch("app.services.llm.call_llm")
def test_extract_with_retry_degrades_to_empty_draft(mock_call_llm: MagicMock) -> None:
    # Simulate LLM failure (e.g. invalid API key or connection error)
    mock_call_llm.side_effect = Exception("Groq API Key Invalid / Provider error")

    result, status_str, error_msg = extract_with_retry(
        raw_text="Some text",
        reference_date_iso="2026-08-04T17:00:00+05:30",
        provider="groq",
        max_retries=1,
    )

    # Retried once (total 2 attempts)
    assert mock_call_llm.call_count == 2
    assert status_str == "failed"
    assert "Groq API Key Invalid" in (error_msg or "")
    # Returns empty draft rather than raising exception
    assert result.postings == []


@patch("app.routers.ingest.extract_with_retry")
@patch("app.routers.ingest.log_ingestion_attempt")
def test_ingest_text_degrades_gracefully(
    mock_log: MagicMock, mock_extract: MagicMock
) -> None:
    # Endpoint degraded to empty draft
    mock_extract.return_value = (
        ExtractionResult(postings=[]),
        "failed",
        "Provider unreachable",
    )

    response = client.post("/ingest/text", json={"text": "broken request"})

    assert response.status_code == 200
    assert response.json() == {"postings": []}
    mock_log.assert_called_once_with(
        source_type="whatsapp_text",
        status="failed",
        error_message="Provider unreachable",
    )
