"""Automated tests for ingestion rate limiting (PRD Section 1.4)."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.models.extraction import ExtractionResult

client = TestClient(app)


@patch("app.routers.ingest.extract_with_retry")
@patch("app.routers.ingest.log_ingestion_attempt")
def test_rate_limiting_ingest_text(mock_log: MagicMock, mock_extract: MagicMock) -> None:
    """Rapid ingestion requests trigger HTTP 429 Too Many Requests."""
    mock_extract.return_value = (ExtractionResult(postings=[]), "success", None)

    # Make 10 requests (within limit of 10/min)
    for _ in range(10):
        resp = client.post("/ingest/text", json={"text": "test prompt"})
        assert resp.status_code == 200

    # 11th request exceeds limit -> 429 Too Many Requests
    resp_over = client.post("/ingest/text", json={"text": "test prompt over limit"})
    assert resp_over.status_code == 429
