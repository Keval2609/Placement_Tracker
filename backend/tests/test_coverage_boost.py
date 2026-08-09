"""Unit tests targeting high-value coverage paths in drive_service.py and llm.py."""

from unittest.mock import MagicMock, patch

import pytest
from fastapi import HTTPException

from app.config import Settings
from app.models.drives import ConfirmUpdatePayload, CreateDriveRequest
from app.services.drive_service import (
    _in_memory_applications,
    build_existing_drive_summary,
    clear_in_memory_db,
    confirm_and_merge_update,
    create_update_draft,
    generate_signed_storage_url,
    get_drive_detail,
    get_drive_documents,
    get_drive_timeline,
    save_drive,
    update_application_status,
)
from app.services.llm import _call_groq


@pytest.fixture(autouse=True)
def reset_db() -> None:
    """Clear test in-memory storage before each test."""
    clear_in_memory_db()


def test_generate_signed_storage_url_supabase_and_fallback() -> None:
    """generate_signed_storage_url handles Supabase signed URLs and fallback URLs."""
    # 1. Supabase success path
    with patch("app.services.drive_service.get_service_client") as mock_supabase:
        mock_client = MagicMock()
        mock_client.storage.from_().create_signed_url.return_value = {
            "signedUrl": "https://supabase.co/signed/doc.pdf"
        }
        mock_supabase.return_value = mock_client

        url = generate_signed_storage_url("doc/123/doc.pdf", doc_id="doc123")
        assert "https://supabase.co/signed/doc.pdf" in url

    # 2. Supabase exception / fallback path
    with patch("app.services.drive_service.get_service_client") as mock_supabase:
        mock_supabase.side_effect = Exception("Storage error")
        url_fallback = generate_signed_storage_url("doc/123/doc.pdf", doc_id="doc123")
        assert "/drives/documents/doc123/download" in url_fallback


@patch("app.services.drive_service.get_settings")
@patch("app.services.drive_service.get_service_client")
def test_save_drive_supabase_flow(mock_get_client: MagicMock, mock_settings: MagicMock) -> None:
    """save_drive handles full Supabase flow for company creation and file upload."""
    dummy_settings = Settings(
        supabase_url="https://fake.supabase.co",
        supabase_service_role_key="fake-key",
    )
    mock_settings.return_value = dummy_settings

    mock_client = MagicMock()
    # Company search returns empty -> creates company
    mock_client.table().select().ilike().execute.return_value.data = []
    # Drive dedup search returns empty -> creates drive
    mock_client.table().select().eq().eq().execute.return_value.data = []

    mock_get_client.return_value = mock_client

    payload = CreateDriveRequest(
        company_name="Stripe",
        role_title="Backend Engineer",
        dates=[
            {
                "date_type": "application_deadline",
                "date_iso": "2026-09-01T23:59:59+05:30",
                "confirmed_by_user": True,
            }
        ],
    )

    resp = save_drive(
        payload=payload,
        user_id="user123",
        file_bytes=b"dummy content",
        filename="jd.pdf",
        content_type="application/pdf",
    )

    assert resp.company_name == "Stripe"
    assert resp.status == "confirmed"
    mock_client.storage.from_().upload.assert_called_once()


@patch("app.services.drive_service.get_settings")
@patch("app.services.drive_service.get_service_client")
def test_build_existing_drive_summary_supabase(
    mock_get_client: MagicMock, mock_settings: MagicMock
) -> None:
    """build_existing_drive_summary fetches drive state from Supabase."""
    mock_settings.return_value = Settings(
        supabase_url="https://fake.supabase.co",
        supabase_service_role_key="fake-key",
    )
    mock_client = MagicMock()
    d_data = [{"id": "drive1", "company_id": "c1", "role_title": "SWE", "min_cgpa": 8.0}]
    c_data = [{"name": "Apple"}]
    date_data = [{"date_type": "application_deadline", "date_iso": "2026-08-15T23:59:59+05:30"}]
    mock_client.table().select().eq().execute.side_effect = [
        MagicMock(data=d_data),
        MagicMock(data=c_data),
        MagicMock(data=date_data),
    ]
    mock_get_client.return_value = mock_client

    summary = build_existing_drive_summary("drive1", user_id="user123")
    assert "Company: Apple" in summary
    assert "Min CGPA: 8.0" in summary


def test_create_update_draft_empty_payload_raises_400() -> None:
    """create_update_draft with empty text raises HTTP 400."""
    date_item = {
        "date_type": "application_deadline",
        "date_iso": "2026-09-01T23:59:59+05:30",
        "confirmed_by_user": True,
    }
    payload = CreateDriveRequest(
        company_name="Meta",
        role_title="Software Engineer",
        dates=[date_item],
    )
    drive_res = save_drive(payload=payload, user_id="u1")

    with pytest.raises(HTTPException) as exc_info:
        create_update_draft(drive_id=drive_res.id, user_id="u1", text="   ", file_bytes=None)
    assert exc_info.value.status_code == 400
    assert "No text or document content provided" in exc_info.value.detail


@patch("app.services.drive_service.validate_and_parse_file")
@patch("app.services.drive_service.extract_update_diff")
def test_create_update_draft_with_file_upload(
    mock_extract_diff: MagicMock, mock_validate_file: MagicMock
) -> None:
    """create_update_draft handles file parsing and diff extraction."""
    from app.models.extraction import UpdateResult

    mock_validate_file.return_value = ("Parsed update text from file", "pdf")
    mock_extract_diff.return_value = (
        UpdateResult(new_dates=[], field_changes={}, summary_of_changes="No change"),
        "success",
        None,
    )

    date_item = {
        "date_type": "application_deadline",
        "date_iso": "2026-09-10T23:59:59+05:30",
        "confirmed_by_user": True,
    }
    payload = CreateDriveRequest(
        company_name="Tesla",
        role_title="Autopilot SWE",
        dates=[date_item],
    )
    drive_res = save_drive(payload=payload, user_id="u1")

    resp = create_update_draft(
        drive_id=drive_res.id,
        user_id="u1",
        text=None,
        file_bytes=b"Sample PDF content for drive update",
        filename="update.pdf",
        file_content_type="application/pdf",
    )
    assert resp.drive_id == drive_res.id
    assert resp.update_result.summary_of_changes == "No change"


@patch("app.services.drive_service.get_settings")
@patch("app.services.drive_service.get_service_client")
def test_confirm_and_merge_update_supabase_flow(
    mock_get_client: MagicMock, mock_settings: MagicMock
) -> None:
    """confirm_and_merge_update merges diff into Supabase tables."""
    mock_settings.return_value = Settings(
        supabase_url="https://fake.supabase.co",
        supabase_service_role_key="fake-key",
    )
    mock_client = MagicMock()
    mock_get_client.return_value = mock_client

    payload = ConfirmUpdatePayload(
        confirmed_new_dates=[
            {
                "date_type": "interview",
                "label": "Interview Round 1",
                "date_iso": "2026-09-12T10:00:00+05:30",
                "date_raw": "Sep 12",
                "source": "ai_suggested",
                "confirmed_by_user": True,
            }
        ],
        confirmed_field_changes={"min_cgpa": 8.5},
        summary_of_changes="Interview date added; CGPA updated",
    )

    resp = confirm_and_merge_update(
        drive_id="drive123",
        update_id="update123",
        user_id="user123",
        payload=payload,
    )
    assert resp.drive_id == "drive123"
    assert resp.added_dates_count == 1
    mock_client.table().insert.assert_called()


@patch("app.services.drive_service.get_settings")
@patch("app.services.drive_service.get_service_client")
def test_get_drive_detail_timeline_documents_supabase(
    mock_get_client: MagicMock, mock_settings: MagicMock
) -> None:
    """get_drive_detail, get_drive_timeline, get_drive_documents query Supabase."""
    mock_settings.return_value = Settings(
        supabase_url="https://fake.supabase.co",
        supabase_service_role_key="fake-key",
    )
    mock_client = MagicMock()

    drive_row = {"id": "d1", "company_id": "c1", "role_title": "SWE", "min_cgpa": 8.0}
    company_row = {"name": "Netflix", "company_type": "tech_product"}
    date_row = {
        "id": "dt1",
        "date_type": "application_deadline",
        "label": "Deadline",
        "date_iso": "2026-09-01T23:59:59+05:30",
        "date_raw": "Sep 1",
        "source": "user_added",
        "confirmed_by_user": True,
        "is_primary_deadline": True,
    }
    app_row = {"id": "app1", "status": "applied", "notes": "Applied online"}
    doc_row = {
        "id": "doc1",
        "storage_path": "path/doc1.pdf",
        "original_filename": "doc1.pdf",
        "uploaded_at": "2026-08-01T10:00:00+05:30",
    }

    def table_mock(table_name: str) -> MagicMock:
        t_mock = MagicMock()
        if table_name == "drives":
            t_mock.select().eq().execute.return_value = MagicMock(data=[drive_row])
        elif table_name == "companies":
            t_mock.select().eq().execute.return_value = MagicMock(data=[company_row])
        elif table_name == "drive_dates":
            t_mock.select().eq().order().execute.return_value = MagicMock(data=[date_row])
            t_mock.select().eq().execute.return_value = MagicMock(data=[date_row])
        elif table_name == "applications":
            t_mock.select().eq().execute.return_value = MagicMock(data=[app_row])
        elif table_name == "drive_updates":
            t_mock.select().eq().order().execute.return_value = MagicMock(data=[])
        elif table_name == "drive_documents":
            t_mock.select().eq().order().execute.return_value = MagicMock(data=[doc_row])
        return t_mock

    mock_client.table.side_effect = table_mock
    mock_client.storage.from_().create_signed_url.return_value = {
        "signedUrl": "https://signed.url/doc1.pdf"
    }
    mock_get_client.return_value = mock_client

    detail = get_drive_detail("d1", "u1")
    assert detail.company_name == "Netflix"
    assert detail.application_status == "applied"

    timeline = get_drive_timeline("d1", "u1")
    assert len(timeline.timeline) == 1

    docs = get_drive_documents("d1", "u1")
    assert len(docs.documents) == 1
    assert docs.documents[0].original_filename == "doc1.pdf"


def test_update_application_status_404_and_notes() -> None:
    """update_application_status returns 404 for invalid app ID and updates notes."""
    with pytest.raises(HTTPException) as exc_info:
        update_application_status(
            application_id="invalid_id", user_id="u1", new_status="applied", notes=None
        )
    assert exc_info.value.status_code == 404

    date_item = {
        "date_type": "application_deadline",
        "date_iso": "2026-09-01T23:59:59+05:30",
        "confirmed_by_user": True,
    }
    payload = CreateDriveRequest(
        company_name="Adobe",
        role_title="UI Engineer",
        dates=[date_item],
    )
    drive_res = save_drive(payload=payload, user_id="u1")

    # Retrieve created application from in-memory store dict
    app_item = next(a for a in _in_memory_applications.values() if a["drive_id"] == drive_res.id)
    app_id = app_item["id"]

    res = update_application_status(
        application_id=app_id, user_id="u1", new_status="interview", notes="Referred by employee"
    )
    assert res.notes == "Referred by employee"


@patch("httpx.Client.post")
@patch.dict("sys.modules", {"groq": None})
def test_call_groq_http_fallback(mock_httpx_post: MagicMock) -> None:
    """_call_groq falls back to httpx HTTP call when groq package is unavailable."""
    mock_resp = MagicMock()
    mock_resp.json.return_value = {"choices": [{"message": {"content": '{"postings": []}'}}]}
    mock_httpx_post.return_value = mock_resp

    dummy_settings = Settings(groq_api_key="fake-key", groq_model="llama-3.3-70b-versatile")
    out = _call_groq("system prompt", "raw text", dummy_settings)
    assert out == '{"postings": []}'


@patch("groq.Groq")
def test_call_groq_empty_response_raises_value_error(mock_groq_class: MagicMock) -> None:
    """_call_groq raises ValueError if completion message content is empty."""
    mock_client = MagicMock()
    mock_groq_class.return_value = mock_client
    mock_completion = MagicMock()
    mock_completion.choices = [MagicMock()]
    mock_completion.choices[0].message.content = ""
    mock_client.chat.completions.create.return_value = mock_completion

    dummy_settings = Settings(groq_api_key="fake-key")
    with pytest.raises(ValueError, match="Empty response received"):
        _call_groq("sys", "text", dummy_settings)
