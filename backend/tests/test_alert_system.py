"""Automated tests for Web Push, VAPID, Telegram Linking, Escalation Engine, and Onboarding Test."""

import zoneinfo
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.alert_service import (
    _alert_history,
    clear_alert_stores,
    link_telegram_chat,
    run_deadline_check_job,
    run_escalation_job,
    save_push_subscription,
)
from app.services.drive_service import clear_in_memory_db

client = TestClient(app)
KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")


@pytest.fixture(autouse=True)
def reset_stores() -> None:
    """Clear test stores before each test."""
    clear_in_memory_db()
    clear_alert_stores()


def test_get_vapid_public_key() -> None:
    """Test retrieving public VAPID key."""
    resp = client.get("/push/vapid-public-key")
    assert resp.status_code == 200
    data = resp.json()
    assert "public_key" in data
    assert len(data["public_key"]) > 0


def test_push_subscribe_and_ack() -> None:
    """Test registering push subscription and sending receipt acknowledgment."""
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test_endpoint_token_123",
        "keys": {
            "p256dh": "BNc_test_p256dh_key_base64",
            "auth": "test_auth_secret_key",
        },
    }
    sub_resp = client.post("/push/subscribe", json=sub_payload)
    assert sub_resp.status_code == 200
    assert "subscription saved" in sub_resp.json()["message"].lower()

    # Trigger onboarding test push
    test_resp = client.post("/push/onboarding-test")
    assert test_resp.status_code == 200
    alert_id = test_resp.json()["test_id"]

    # Check status before ACK
    status1 = client.get("/push/onboarding-test/status")
    assert status1.status_code == 200
    assert status1.json()["ack_received"] is False
    assert status1.json()["show_oem_warning"] is True

    # Send ACK
    ack_resp = client.post("/push/ack", json={"alert_id": alert_id})
    assert ack_resp.status_code == 200
    assert ack_resp.json()["acknowledged"] is True

    # Check status after ACK
    status2 = client.get("/push/onboarding-test/status")
    assert status2.status_code == 200
    assert status2.json()["ack_received"] is True
    assert status2.json()["show_oem_warning"] is False


def test_telegram_link_flow() -> None:
    """Test linking user Telegram chat_id."""
    link_resp = client.post("/telegram/link", json={"chat_id": "987654321"})
    assert link_resp.status_code == 200
    assert link_resp.json()["chat_id"] == "987654321"

    status_resp = client.get("/telegram/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["is_linked"] is True
    assert status_resp.json()["chat_id"] == "987654321"


def test_telegram_test_endpoint(monkeypatch: pytest.MonkeyPatch) -> None:
    """Test triggering immediate test alert to linked Telegram chat."""
    client.post("/telegram/link", json={"chat_id": "987654321"})

    # Case 1: bot token not set -> should return 400 with helpful explanation
    resp = client.post("/telegram/test")
    assert resp.status_code == 400
    assert "TELEGRAM_BOT_TOKEN is not configured" in resp.json()["detail"]

    # Case 2: bot token set and send succeeds -> returns 200
    from unittest.mock import AsyncMock
    monkeypatch.setattr(
        "app.routers.alerts.send_telegram_test_message_async",
        AsyncMock(return_value=(True, "Delivered successfully")),
    )
    resp2 = client.post("/telegram/test")
    assert resp2.status_code == 200
    assert resp2.json()["success"] is True


@pytest.mark.asyncio
async def test_escalation_logic_unacked_push_to_telegram() -> None:
    """Acceptance Criteria: Unacked Web Push > 10 mins auto-fires Telegram fallback."""
    from app.dependencies import DEFAULT_MOCK_USER_ID

    # 1. Register push subscription and link Telegram account
    save_push_subscription(
        user_id=DEFAULT_MOCK_USER_ID,
        subscription={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test_user_token",
            "keys": {"p256dh": "dummy", "auth": "dummy"},
        },
    )
    link_telegram_chat(user_id=DEFAULT_MOCK_USER_ID, chat_id="123456789")

    # 2. Create drive with deadline in 5 hours (triggers 6h threshold)
    deadline_iso = (datetime.now(KOLKATA_TZ) + timedelta(hours=5)).isoformat()
    client.post(
        "/drives",
        json={
            "company_name": "Goldman Sachs",
            "role_title": "Software Engineer",
            "dates": [
                {
                    "date_type": "application_deadline",
                    "date_iso": deadline_iso,
                    "confirmed_by_user": True,
                    "is_primary_deadline": True,
                }
            ],
        },
    )

    # 3. Run scheduled deadline check -> fires Web Push alert
    run_deadline_check_job()

    assert len(_alert_history) == 1
    alert_id = list(_alert_history.keys())[0]
    rec = _alert_history[alert_id]
    assert rec["status"] == "push_sent"
    assert rec["ack_received"] is False
    assert rec["threshold"] == "6h"

    # Simulate 11 minutes passing without ACK
    past_sent_time = (datetime.now(KOLKATA_TZ) - timedelta(minutes=11)).isoformat()
    rec["push_sent_at"] = past_sent_time

    # 4. Run escalation job -> should escalate to Telegram fallback
    with patch(
        "app.services.alert_service.send_telegram_message_async",
        new_callable=AsyncMock,
        return_value=True,
    ):
        await run_escalation_job()

    assert rec["status"] == "telegram_escalated"
    assert "telegram_sent_at" in rec


def test_applied_drive_skips_deadline_alert() -> None:
    """Acceptance Criteria: Once a drive has been marked 'applied' (or beyond),

    deadline alerts are skipped.
    """
    from app.dependencies import DEFAULT_MOCK_USER_ID

    # 1. Register push subscription
    save_push_subscription(
        user_id=DEFAULT_MOCK_USER_ID,
        subscription={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test_applied_user_token",
            "keys": {"p256dh": "dummy", "auth": "dummy"},
        },
    )

    # 2. Create drive with deadline in 5 hours (would normally trigger 6h threshold)
    deadline_iso = (datetime.now(KOLKATA_TZ) + timedelta(hours=5)).isoformat()
    resp = client.post(
        "/drives",
        json={
            "company_name": "Cisco",
            "role_title": "Software Engineer",
            "dates": [
                {
                    "date_type": "application_deadline",
                    "date_iso": deadline_iso,
                    "confirmed_by_user": True,
                    "is_primary_deadline": True,
                }
            ],
        },
    )
    assert resp.status_code == 201
    drive_id = resp.json()["id"]

    # 3. Retrieve application ID for the drive and mark it as 'applied'
    drives_list_resp = client.get("/drives")
    assert drives_list_resp.status_code == 200
    card = next(d for d in drives_list_resp.json()["drives"] if d["id"] == drive_id)
    app_id = card["application_id"]

    patch_resp = client.patch(
        f"/applications/{app_id}",
        json={"status": "applied"},
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "applied"

    # 4. Run scheduled deadline check
    run_deadline_check_job()

    # 5. Verify NO alert was fired because candidate has already applied
    assert len(_alert_history) == 0
