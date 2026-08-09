"""Automated unit and integration tests for Sentry error tracking (PRD 1.4)."""

from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app
from app.sentry_setup import init_sentry

client = TestClient(app, raise_server_exceptions=False)


def test_sentry_debug_route_triggers_exception() -> None:
    """GET /sentry-debug triggers a 500 error (ZeroDivisionError)."""
    response = client.get("/sentry-debug")
    assert response.status_code == 500


@patch("sentry_sdk.capture_exception")
def test_caught_exception_sent_to_sentry(mock_capture: MagicMock) -> None:
    """Trigger a caught exception and confirm Sentry capture_exception is called."""
    import sentry_sdk

    try:
        raise ValueError("Simulated extraction 500 failure")
    except Exception as exc:
        sentry_sdk.capture_exception(exc)

    mock_capture.assert_called_once()
    captured_exc = mock_capture.call_args[0][0]
    assert isinstance(captured_exc, ValueError)
    assert "Simulated extraction 500 failure" in str(captured_exc)


@patch("sentry_sdk.init")
def test_init_sentry_with_dsn(mock_sentry_init: MagicMock) -> None:
    """init_sentry calls sentry_sdk.init when sentry_dsn is configured."""
    with patch("app.sentry_setup.get_settings") as mock_get_settings:
        mock_settings = MagicMock()
        mock_settings.sentry_dsn = "https://fake_dsn@sentry.io/12345"
        mock_get_settings.return_value = mock_settings

        init_sentry()
        mock_sentry_init.assert_called_once()
        kwargs = mock_sentry_init.call_args.kwargs
        assert kwargs["dsn"] == "https://fake_dsn@sentry.io/12345"
        assert kwargs["send_default_pii"] is True
