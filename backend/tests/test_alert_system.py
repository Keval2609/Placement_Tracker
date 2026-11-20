"""Automated tests for Web Push, VAPID, Subscription Management, and Scheduled Deadline Alerts."""

import zoneinfo
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.alert_service import (
    _alert_history,
    clear_alert_stores,
    get_user_subscriptions,
    run_deadline_check_job,
    save_push_subscription,
)
from app.services.drive_service import clear_in_memory_db

KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")


@pytest.fixture(autouse=True)
def reset_stores() -> None:
    """Clear test stores before each test."""
    clear_in_memory_db()
    clear_alert_stores()


@pytest.fixture
def client():
    """Create test client without background scheduler lifecycle hang."""
    with TestClient(app) as test_client:
        yield test_client


def test_get_vapid_public_key(client: TestClient) -> None:
    """Test retrieving public VAPID key."""
    resp = client.get("/push/vapid-public-key")
    assert resp.status_code == 200
    data = resp.json()
    assert "public_key" in data
    assert len(data["public_key"]) > 0


def test_push_subscribe_and_ack(client: TestClient) -> None:
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

    # Check status
    status_resp = client.get("/push/status")
    assert status_resp.status_code == 200
    assert status_resp.json()["is_enabled"] is True
    assert status_resp.json()["device_count"] >= 1

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


def test_push_test_endpoint(client: TestClient) -> None:
    """Test triggering immediate mobile verification push notification."""
    # Without subscription
    resp1 = client.post("/push/test")
    assert resp1.status_code == 200
    assert resp1.json()["success"] is False

    # With subscription
    sub_payload = {
        "endpoint": "https://fcm.googleapis.com/fcm/send/test_device_phone_999",
        "keys": {"p256dh": "dummy_p256dh", "auth": "dummy_auth"},
    }
    client.post("/push/subscribe", json=sub_payload)

    resp2 = client.post("/push/test")
    assert resp2.status_code == 200
    assert resp2.json()["success"] is True
    assert resp2.json()["device_count"] == 1


def test_push_unsubscribe(client: TestClient) -> None:
    """Test unregistering a push subscription."""
    endpoint = "https://fcm.googleapis.com/fcm/send/test_device_to_remove"
    sub_payload = {
        "endpoint": endpoint,
        "keys": {"p256dh": "dummy", "auth": "dummy"},
    }
    client.post("/push/subscribe", json=sub_payload)

    unsub_resp = client.post("/push/unsubscribe", json={"endpoint": endpoint})
    assert unsub_resp.status_code == 200

    from app.dependencies import DEFAULT_MOCK_USER_ID
    subs = get_user_subscriptions(DEFAULT_MOCK_USER_ID)
    assert not any(s.get("endpoint") == endpoint for s in subs)


def test_deadline_check_fires_push_alert(client: TestClient) -> None:
    """Acceptance criteria: Background deadline check fires push alert at 6h threshold."""
    from app.dependencies import DEFAULT_MOCK_USER_ID

    # 1. Register push subscription
    save_push_subscription(
        user_id=DEFAULT_MOCK_USER_ID,
        subscription={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test_user_token_abc",
            "keys": {"p256dh": "dummy", "auth": "dummy"},
        },
    )

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


def test_applied_drive_skips_deadline_alert(client: TestClient) -> None:
    """Acceptance criteria: Once a drive has been marked 'applied', deadline alerts are skipped."""
    from app.dependencies import DEFAULT_MOCK_USER_ID

    save_push_subscription(
        user_id=DEFAULT_MOCK_USER_ID,
        subscription={
            "endpoint": "https://fcm.googleapis.com/fcm/send/test_applied_user_token",
            "keys": {"p256dh": "dummy", "auth": "dummy"},
        },
    )

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

    run_deadline_check_job()
    assert len(_alert_history) == 0
