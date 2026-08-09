"""Unit tests for extraction response validation & Pydantic schemas (PRD 1.4 & 3.3)."""

from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.models.extraction import ExtractionResult, UpdateResult
from app.services.llm import extract_with_retry


def test_extraction_result_valid_json() -> None:
    """Valid JSON from LLM successfully parses into ExtractionResult."""
    valid_json = """{
        "postings": [
            {
                "company_name": "Google",
                "role_title": "Software Engineer",
                "min_cgpa": 8.0,
                "eligible_branches": ["CSE", "IT"],
                "application_link": "https://careers.google.com/job/123",
                "dates": [
                    {
                        "date_type": "application_deadline",
                        "label": "Application Deadline",
                        "date_iso": "2026-08-15T23:59:59+05:30",
                        "date_raw": "Aug 15"
                    }
                ]
            }
        ]
    }"""
    result = ExtractionResult.model_validate_json(valid_json)
    assert len(result.postings) == 1
    assert result.postings[0].company_name == "Google"
    assert result.postings[0].min_cgpa == 8.0
    assert result.postings[0].dates[0].date_type == "application_deadline"


def test_extraction_result_malformed_json() -> None:
    """Malformed or invalid date_type JSON raises ValidationError."""
    invalid_date_type_json = """{
        "postings": [
            {
                "company_name": "Google",
                "role_title": "SWE",
                "dates": [
                    {
                        "date_type": "invalid_type_string",
                        "date_iso": "2026-08-15T23:59:59+05:30",
                        "date_raw": "Aug 15"
                    }
                ]
            }
        ]
    }"""
    with pytest.raises(ValidationError):
        ExtractionResult.model_validate_json(invalid_date_type_json)


def test_extraction_result_missing_required_fields() -> None:
    """Missing company_name or role_title raises ValidationError."""
    missing_company_json = """{
        "postings": [
            {
                "role_title": "Software Engineer"
            }
        ]
    }"""
    with pytest.raises(ValidationError):
        ExtractionResult.model_validate_json(missing_company_json)


@patch("app.services.llm.call_llm")
def test_extract_with_retry_valid_mock_llm(mock_call_llm: MagicMock) -> None:
    """extract_with_retry handles valid mock LLM responses."""
    mock_json = """{
        "postings": [
            {
                "company_name": "Amazon",
                "role_title": "SDE-1",
                "dates": []
            }
        ]
    }"""
    mock_call_llm.return_value = mock_json

    result, status_str, error_msg = extract_with_retry(
        raw_text="Amazon hiring SDE-1",
        reference_date_iso="2026-08-09T10:00:00+05:30",
    )
    assert status_str == "success"
    assert error_msg is None
    assert len(result.postings) == 1
    assert result.postings[0].company_name == "Amazon"


@patch("app.services.llm.call_llm")
def test_extract_with_retry_malformed_mock_llm(mock_call_llm: MagicMock) -> None:
    """extract_with_retry retries on malformed JSON and degrades gracefully to empty draft."""
    mock_call_llm.return_value = '{"invalid_json": true}'

    result, status_str, error_msg = extract_with_retry(
        raw_text="Broken text",
        reference_date_iso="2026-08-09T10:00:00+05:30",
        max_retries=1,
    )
    assert status_str == "failed"
    assert error_msg is not None
    assert result.postings == []
    assert mock_call_llm.call_count == 2


def test_update_result_validation() -> None:
    """UpdateResult Pydantic schema validation."""
    valid_update_json = """{
        "new_dates": [
            {
                "date_type": "interview",
                "label": "Technical Interview",
                "date_iso": "2026-08-20T10:00:00+05:30",
                "date_raw": "20th August"
            }
        ],
        "field_changes": {"min_cgpa": 7.5},
        "summary_of_changes": "Added interview date on Aug 20"
    }"""
    res = UpdateResult.model_validate_json(valid_update_json)
    assert len(res.new_dates) == 1
    assert res.field_changes.get("min_cgpa") == 7.5
    assert res.summary_of_changes == "Added interview date on Aug 20"
