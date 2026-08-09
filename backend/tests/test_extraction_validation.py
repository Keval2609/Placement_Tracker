"""Unit tests for extraction response validation & Pydantic schemas (PRD 1.4 & 3.3)."""

from unittest.mock import MagicMock, patch

import pytest
from pydantic import ValidationError

from app.models.extraction import ExtractionResult, UpdateResult
from app.services.llm import extract_update_diff, extract_with_retry


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
    """extract_with_retry retries on error and degrades to empty draft."""
    mock_call_llm.side_effect = Exception("LLM Provider malformed output")

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


def test_call_llm_unsupported_provider() -> None:
    """call_llm with unsupported provider raises ValueError."""
    from app.services.llm import call_llm

    with pytest.raises(ValueError, match="is not approved for personal data"):
        call_llm("sys", "user text", provider="unsupported_provider")


def test_call_groq_missing_api_key() -> None:
    """_call_groq with empty groq_api_key raises ValueError."""
    from app.config import Settings
    from app.services.llm import _call_groq

    dummy_settings = Settings(groq_api_key="")
    with pytest.raises(ValueError, match="GROQ_API_KEY is not configured"):
        _call_groq("sys prompt", "user text", dummy_settings)


@patch("httpx.Client.post")
def test_call_ollama_success(mock_post: MagicMock) -> None:
    """_call_ollama successfully parses response message content."""
    from app.config import Settings
    from app.services.llm import _call_ollama

    mock_resp = MagicMock()
    mock_resp.json.return_value = {"message": {"content": '{"postings": []}'}}
    mock_post.return_value = mock_resp

    dummy_settings = Settings(ollama_base_url="http://localhost:11434")
    out = _call_ollama("sys", "user text", dummy_settings)
    assert out == '{"postings": []}'


@patch("app.services.llm.call_llm")
def test_extract_update_diff_retry_and_degrade(mock_call_llm: MagicMock) -> None:
    """extract_update_diff retries and degrades gracefully on failure."""
    mock_call_llm.side_effect = Exception("Diff LLM error")

    res, status_str, err_msg = extract_update_diff(
        new_raw_text="new text",
        existing_drive_summary="existing summary",
        reference_date_iso="2026-08-09T10:00:00+05:30",
        max_retries=1,
    )
    assert status_str == "failed"
    assert "Diff LLM error" in (err_msg or "")
    assert res.new_dates == []
    assert "Failed" in res.summary_of_changes


@patch("groq.Groq")
def test_call_groq_success(mock_groq_class: MagicMock) -> None:
    """_call_groq successfully invokes Groq SDK client."""
    from app.config import Settings
    from app.services.llm import _call_groq

    mock_client = MagicMock()
    mock_groq_class.return_value = mock_client
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = '{"postings": []}'
    mock_client.chat.completions.create.return_value = mock_completion

    dummy_settings = Settings(groq_api_key="gsk_dummy_key")
    out = _call_groq("sys", "user text", dummy_settings)
    assert out == '{"postings": []}'
