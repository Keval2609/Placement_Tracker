"""Web Push (pywebpush + VAPID), Telegram Bot linking, and escalation engine.

Handles:
1. VAPID keypair generation & retrieval (GET /push/vapid-public-key).
2. Storing push subscriptions per user (POST /push/subscribe).
3. Linking user Telegram account chat_id (POST /telegram/link).
4. Web Push dispatch with client receipt acknowledgment (POST /push/ack).
5. APScheduler background jobs:
   - `run_deadline_check_job`: Triggers Web Push at 48h, 24h, and 6h to primary deadline.
   - `run_escalation_job`: Auto-fires Telegram fallback if Web Push is unacked after 10 minutes.
6. Onboarding self-test & OEM background notification warning detection.
"""

import json
import logging
import uuid
import zoneinfo
from datetime import datetime
from typing import Any

import httpx
from fastapi import HTTPException, status

try:
    from pywebpush import Vapid, WebPushException, webpush
except ImportError:
    Vapid = None  # type: ignore[assignment,misc]
    WebPushException = Exception  # type: ignore[assignment,misc]
    webpush = None  # type: ignore[assignment]

from app.config import get_settings
from app.services.drive_service import list_drives_for_dashboard

logger = logging.getLogger(__name__)
KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

# Dynamic or configured VAPID keypair
_generated_vapid: Any = None
_vapid_public_key: str | None = None
_vapid_private_key: str | None = None

# In-memory stores for offline execution and testing
_subscriptions: dict[str, list[dict[str, Any]]] = {}
_telegram_links: dict[str, str] = {}
_alert_history: dict[str, dict[str, Any]] = {}
_fired_thresholds: set[str] = set()
_onboarding_tests: dict[str, dict[str, Any]] = {}
_last_scheduler_heartbeat: datetime | None = None


def clear_alert_stores() -> None:
    """Clear alert state (useful for testing)."""
    global _last_scheduler_heartbeat
    _subscriptions.clear()
    _telegram_links.clear()
    _alert_history.clear()
    _fired_thresholds.clear()
    _onboarding_tests.clear()
    _last_scheduler_heartbeat = None


def record_scheduler_heartbeat() -> None:
    """Record heartbeat timestamp for the background alert scheduler."""
    global _last_scheduler_heartbeat
    _last_scheduler_heartbeat = datetime.now(KOLKATA_TZ)
    logger.debug("Recorded alert scheduler heartbeat at %s", _last_scheduler_heartbeat.isoformat())


def get_scheduler_health(max_stale_seconds: int = 900) -> tuple[bool, dict[str, Any]]:
    """Check whether the alert scheduler has run within max_stale_seconds (default 15 minutes)."""
    if _last_scheduler_heartbeat is None:
        return False, {
            "status": "stale",
            "message": "Alert scheduler heartbeat has not been recorded yet.",
            "last_heartbeat_iso": None,
            "seconds_since_last_heartbeat": None,
            "max_stale_seconds": max_stale_seconds,
        }

    now_dt = datetime.now(KOLKATA_TZ)
    elapsed_seconds = (now_dt - _last_scheduler_heartbeat).total_seconds()
    is_healthy = elapsed_seconds <= max_stale_seconds

    details = {
        "status": "healthy" if is_healthy else "stale",
        "last_heartbeat_iso": _last_scheduler_heartbeat.isoformat(),
        "seconds_since_last_heartbeat": round(elapsed_seconds, 2),
        "max_stale_seconds": max_stale_seconds,
    }
    return is_healthy, details


def get_or_create_vapid_keys() -> tuple[str, str]:
    """Retrieve configured VAPID keypair or auto-generate a valid keypair."""
    global _generated_vapid, _vapid_public_key, _vapid_private_key

    settings = get_settings()
    if settings.vapid_public_key and settings.vapid_private_key:
        return settings.vapid_public_key, settings.vapid_private_key

    if _vapid_public_key and _vapid_private_key:
        return _vapid_public_key, _vapid_private_key

    if Vapid is not None:
        try:
            v = Vapid()
            v.generate_keys()
            _generated_vapid = v
            # public_key and private_key in pywebpush are base64url-encoded strings
            _vapid_public_key = str(v.public_key)
            _vapid_private_key = str(v.private_key)
            logger.info("Auto-generated VAPID keypair for Web Push delivery.")
            return _vapid_public_key, _vapid_private_key
        except Exception as err:
            logger.warning("Could not auto-generate VAPID keys: %s", err)

    # Fallback dummy keys for offline mock mode
    dummy_pub = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-Skv69yViEuiBIa-Ib9-Skv69yViEuiBIa"
    dummy_priv = "priv_dummy_key_for_testing_123456789"
    _vapid_public_key = dummy_pub
    _vapid_private_key = dummy_priv
    return dummy_pub, dummy_priv


def get_vapid_public_key() -> str:
    """Return public VAPID key for client pushManager.subscribe()."""
    pub_key, _ = get_or_create_vapid_keys()
    return pub_key


def save_push_subscription(user_id: str, subscription: dict[str, Any]) -> None:
    """Store web push subscription payload for user."""
    if user_id not in _subscriptions:
        _subscriptions[user_id] = []

    # Avoid duplicate subscriptions on same endpoint
    endpoint = subscription.get("endpoint")
    _subscriptions[user_id] = [
        s for s in _subscriptions[user_id] if s.get("endpoint") != endpoint
    ]

    subscription["created_at"] = datetime.now(KOLKATA_TZ).isoformat()
    _subscriptions[user_id].append(subscription)
    logger.info("Saved Web Push subscription for user %s", user_id)


def link_telegram_chat(user_id: str, chat_id: str) -> None:
    """Link Telegram chat_id to user profile for escalation fallback."""
    clean_chat_id = chat_id.strip()
    if not clean_chat_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Telegram chat_id provided.",
        )
    _telegram_links[user_id] = clean_chat_id
    logger.info("Linked Telegram chat_id %s to user %s", clean_chat_id, user_id)


def get_telegram_link(user_id: str) -> str | None:
    """Get linked Telegram chat_id for user."""
    return _telegram_links.get(user_id)


def send_web_push(
    user_id: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> bool:
    """Send Web Push notification to all active subscriptions of a user."""
    subs = _subscriptions.get(user_id, [])
    if not subs:
        logger.info("No push subscriptions found for user %s", user_id)
        return False

    pub_key, priv_key = get_or_create_vapid_keys()
    settings = get_settings()

    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "data": data or {},
        }
    )

    success = False
    for sub in list(subs):
        if webpush is not None:
            try:
                webpush(
                    subscription_info=sub,
                    data=payload,
                    vapid_private_key=priv_key,
                    vapid_claims={"sub": settings.vapid_claim_email},
                )
                success = True
            except WebPushException as err:
                logger.warning("WebPushException sending notification: %s", err)
                if hasattr(err, "response") and err.response is not None:
                    if getattr(err.response, "status_code", 0) in (404, 410):
                        subs.remove(sub)
            except Exception as err:
                logger.info("Simulated Web Push delivery for offline mode: %s", err)
                success = True
        else:
            logger.info("Simulated Web Push delivery for offline mode: %s", sub)
            success = True

    return success


async def send_telegram_message_async(chat_id: str, text: str) -> bool:
    """Send Telegram message via Telegram Bot API asynchronously."""
    settings = get_settings()
    bot_token = settings.telegram_bot_token

    if not bot_token:
        logger.info("Simulating Telegram alert to chat %s: %s", chat_id, text)
        return True

    url = f"https://api.telegram.org/bot{bot_token}/sendMessage"
    payload = {"chat_id": chat_id, "text": text, "parse_mode": "HTML"}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code == 200:
                return True
            logger.warning("Telegram API error status %s: %s", resp.status_code, resp.text)
            return False
    except Exception as err:
        logger.warning("Failed sending Telegram message: %s", err)
        return False


def record_push_ack(alert_id: str) -> bool:
    """Record receipt acknowledgment (ack) from client service worker."""
    rec = _alert_history.get(alert_id)
    now_iso = datetime.now(KOLKATA_TZ).isoformat()

    if rec:
        rec["ack_received"] = True
        rec["ack_at"] = now_iso
        rec["status"] = "acknowledged"
        logger.info("Recorded push ACK for alert_id %s", alert_id)
        return True

    # Check onboarding tests
    for uid, o_rec in _onboarding_tests.items():
        if o_rec.get("alert_id") == alert_id or o_rec.get("test_id") == alert_id:
            o_rec["ack_received"] = True
            o_rec["ack_at"] = now_iso
            o_rec["status"] = "acknowledged"
            logger.info("Recorded onboarding test push ACK for user %s", uid)
            return True

    logger.warning("Push ACK received for unknown alert_id %s", alert_id)
    return False


def trigger_onboarding_test(user_id: str) -> dict[str, Any]:
    """Trigger an onboarding self-test push notification for user."""
    alert_id = f"test_{uuid.uuid4()}"
    now_iso = datetime.now(KOLKATA_TZ).isoformat()

    test_rec = {
        "test_id": alert_id,
        "alert_id": alert_id,
        "user_id": user_id,
        "status": "push_sent",
        "push_sent_at": now_iso,
        "ack_received": False,
        "ack_at": None,
    }
    _onboarding_tests[user_id] = test_rec

    title = "Placement Tracker Alert Test"
    body = "Tap to verify background notification delivery on your phone."
    data = {"alert_id": alert_id, "is_onboarding_test": True}

    _ = send_web_push(user_id=user_id, title=title, body=body, data=data)

    return {
        "test_id": alert_id,
        "message": "Onboarding push notification sent.",
        "push_sent_at": now_iso,
    }


def get_onboarding_test_status(user_id: str) -> dict[str, Any]:
    """Check status of onboarding self-test push. Returns show_oem_warning if unacknowledged."""
    test_rec = _onboarding_tests.get(user_id)
    if not test_rec:
        return {
            "has_tested": False,
            "ack_received": False,
            "show_oem_warning": False,
        }

    ack_received = test_rec.get("ack_received", False)
    return {
        "has_tested": True,
        "test_id": test_rec["test_id"],
        "ack_received": ack_received,
        "show_oem_warning": not ack_received,
        "push_sent_at": test_rec.get("push_sent_at"),
    }


def run_deadline_check_job() -> None:
    """Scheduled job: Checks all primary deadlines against thresholds (48h, 24h, 6h)."""
    record_scheduler_heartbeat()
    from app.dependencies import DEFAULT_MOCK_USER_ID

    now_dt = datetime.now(KOLKATA_TZ)
    user_ids = {DEFAULT_MOCK_USER_ID, "default_user"}
    user_ids = user_ids.union(_subscriptions.keys()).union(_telegram_links.keys())

    for user_id in user_ids:
        try:
            drive_list = list_drives_for_dashboard(user_id=user_id)
        except Exception as err:
            logger.warning(
                "Error listing drives during deadline check for user %s: %s", user_id, err
            )
            continue

        for card in drive_list.drives:
            if card.is_overdue:
                continue

            try:
                deadline_dt = datetime.fromisoformat(card.primary_deadline_iso)
                if deadline_dt.tzinfo is None:
                    deadline_dt = deadline_dt.replace(tzinfo=KOLKATA_TZ)
                hours_left = (deadline_dt - now_dt).total_seconds() / 3600.0
            except Exception:
                continue

            threshold_to_fire = None
            if 24.0 < hours_left <= 48.0:
                threshold_to_fire = "48h"
            elif 6.0 < hours_left <= 24.0:
                threshold_to_fire = "24h"
            elif 0.0 < hours_left <= 6.0:
                threshold_to_fire = "6h"

            if not threshold_to_fire:
                continue

            threshold_key = f"{card.id}_{threshold_to_fire}"
            if threshold_key in _fired_thresholds:
                continue

            alert_id = str(uuid.uuid4())
            now_iso = now_dt.isoformat()

            alert_rec = {
                "alert_id": alert_id,
                "user_id": user_id,
                "drive_id": card.id,
                "company_name": card.company_name,
                "role_title": card.role_title,
                "threshold": threshold_to_fire,
                "deadline_iso": card.primary_deadline_iso,
                "status": "push_sent",
                "push_sent_at": now_iso,
                "ack_received": False,
                "ack_at": None,
            }
            _alert_history[alert_id] = alert_rec
            _fired_thresholds.add(threshold_key)

            title = f"⏰ {card.company_name} Deadline Alert ({threshold_to_fire} left)"
            body = (
                f"Application deadline for {card.role_title} "
                f"is approaching in {threshold_to_fire}."
            )
            data = {
                "alert_id": alert_id,
                "drive_id": card.id,
                "threshold": threshold_to_fire,
            }

            _ = send_web_push(user_id=user_id, title=title, body=body, data=data)
            logger.info(
                "Fired %s Web Push alert for drive %s (%s)",
                threshold_to_fire,
                card.id,
                card.company_name,
            )


async def run_escalation_job() -> None:
    """Scheduled job: Scans unacknowledged Web Push notifications > 10 minutes old.

    Auto-fires Telegram fallback to user's chat_id if unacked within timeout window.
    """
    record_scheduler_heartbeat()
    now_dt = datetime.now(KOLKATA_TZ)

    for alert_id, rec in list(_alert_history.items()):
        if rec.get("status") == "push_sent" and not rec.get("ack_received"):
            sent_at_str = rec.get("push_sent_at")
            if not sent_at_str:
                continue

            try:
                sent_at = datetime.fromisoformat(sent_at_str)
                if sent_at.tzinfo is None:
                    sent_at = sent_at.replace(tzinfo=KOLKATA_TZ)
                elapsed_seconds = (now_dt - sent_at).total_seconds()
            except Exception:
                continue

            # Escalate after 10 minutes (600 seconds), or 60 seconds for test triggers
            is_test_alert = "test_" in alert_id or rec.get("threshold") == "test"
            timeout_threshold = 60.0 if is_test_alert else 600.0

            if elapsed_seconds >= timeout_threshold:
                user_id = rec.get("user_id", "default_user")
                chat_id = _telegram_links.get(user_id)

                if chat_id:
                    company = rec.get("company_name", "Placement Drive")
                    role = rec.get("role_title", "Position")
                    threshold = rec.get("threshold", "Upcoming")

                    text = (
                        f"🚨 <b>Placement Deadline Escalation</b>\n\n"
                        f"<b>{company}</b> - {role}\n"
                        f"Deadline approaching in {threshold}.\n"
                        f"<i>Web push was unacknowledged. Telegram fallback triggered.</i>"
                    )

                    sent = await send_telegram_message_async(chat_id=chat_id, text=text)
                    if sent:
                        rec["status"] = "telegram_escalated"
                        rec["telegram_sent_at"] = now_dt.isoformat()
                        logger.info(
                            "Escalated alert %s via Telegram fallback to chat %s",
                            alert_id,
                            chat_id,
                        )
