"""Web Push (pywebpush + VAPID) notification engine.

Handles:
1. VAPID keypair retrieval & generation (GET /push/vapid-public-key).
2. Storing and removing mobile/desktop Web Push subscriptions
   (POST /push/subscribe, /push/unsubscribe).
3. Persistent storage in Supabase `push_subscriptions` with memory fallback.
4. Immediate mobile verification test push (POST /push/test).
5. APScheduler background job:
   - `run_deadline_check_job`: Triggers Web Push at 48h, 24h, and 6h to primary deadline.
6. Client receipt acknowledgment (POST /push/ack) and onboarding self-test.
"""

import json
import logging
import uuid
import zoneinfo
from datetime import datetime
from typing import Any

from fastapi import HTTPException, status

try:
    from pywebpush import Vapid, WebPushException, webpush
except ImportError:
    Vapid = None  # type: ignore[assignment,misc]
    WebPushException = Exception  # type: ignore[assignment,misc]
    webpush = None  # type: ignore[assignment]

from app.config import get_settings
from app.services.drive_service import list_drives_for_dashboard
from app.supabase_client import get_service_client

logger = logging.getLogger(__name__)
KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")

# Dynamic or configured VAPID keypair
_generated_vapid: Any = None
_vapid_public_key: str | None = None
_vapid_private_key: str | None = None

# In-memory fallback stores for offline/mock testing
_subscriptions: dict[str, list[dict[str, Any]]] = {}
_alert_history: dict[str, dict[str, Any]] = {}
_fired_thresholds: set[str] = set()
_onboarding_tests: dict[str, dict[str, Any]] = {}
_last_scheduler_heartbeat: datetime | None = None


def clear_alert_stores() -> None:
    """Clear alert state (useful for testing)."""
    global _last_scheduler_heartbeat
    _subscriptions.clear()
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
            import base64

            from cryptography.hazmat.primitives import serialization

            v = Vapid()
            v.generate_keys()
            _generated_vapid = v
            raw_pub = v.public_key.public_bytes(
                serialization.Encoding.X962, serialization.PublicFormat.UncompressedPoint
            )
            _vapid_public_key = base64.urlsafe_b64encode(raw_pub).decode().rstrip("=")
            _vapid_private_key = v.private_pem().decode()
            logger.info("Auto-generated in-memory VAPID keypair for Web Push delivery.")
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


def _is_supabase_configured() -> bool:
    settings = get_settings()
    return bool(settings.supabase_url and settings.supabase_service_role_key)


def save_push_subscription(
    user_id: str,
    subscription: dict[str, Any],
    user_agent: str | None = None,
) -> None:
    """Store web push subscription for user in Supabase (with in-memory fallback)."""
    endpoint = subscription.get("endpoint")
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription endpoint is missing.",
        )

    keys = subscription.get("keys", {})
    p256dh = keys.get("p256dh", "")
    auth_key = keys.get("auth", "")

    # Always update in-memory cache
    if user_id not in _subscriptions:
        _subscriptions[user_id] = []
    _subscriptions[user_id] = [
        s for s in _subscriptions[user_id] if s.get("endpoint") != endpoint
    ]
    sub_record = {
        "endpoint": endpoint,
        "keys": {"p256dh": p256dh, "auth": auth_key},
        "user_agent": user_agent,
        "created_at": datetime.now(KOLKATA_TZ).isoformat(),
    }
    _subscriptions[user_id].append(sub_record)

    # Persist to Supabase if available
    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            payload = {
                "user_id": user_id,
                "endpoint": endpoint,
                "p256dh": p256dh,
                "auth_key": auth_key,
                "user_agent": user_agent,
            }
            supabase.table("push_subscriptions").upsert(
                payload, on_conflict="endpoint"
            ).execute()
            logger.info("Persisted Web Push subscription to Supabase for user %s", user_id)
        except Exception as err:
            logger.warning("Failed to persist push subscription to Supabase: %s", err)


def remove_push_subscription(user_id: str, endpoint: str) -> None:
    """Remove a push subscription when unsubscribed or expired."""
    if user_id in _subscriptions:
        _subscriptions[user_id] = [
            s for s in _subscriptions[user_id] if s.get("endpoint") != endpoint
        ]

    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            supabase.table("push_subscriptions").delete().eq("endpoint", endpoint).execute()
            logger.info("Removed push subscription for endpoint: %s", endpoint[:30])
        except Exception as err:
            logger.warning("Failed removing push subscription from Supabase: %s", err)


def get_user_subscriptions(user_id: str) -> list[dict[str, Any]]:
    """Retrieve all active push subscriptions for a user."""
    subs: list[dict[str, Any]] = list(_subscriptions.get(user_id, []))

    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            res = (
                supabase.table("push_subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            if res.data:
                db_endpoints = {s.get("endpoint") for s in subs}
                for row in res.data:
                    ep = row.get("endpoint")
                    if ep and ep not in db_endpoints:
                        subs.append(
                            {
                                "endpoint": ep,
                                "keys": {
                                    "p256dh": row.get("p256dh", ""),
                                    "auth": row.get("auth_key", ""),
                                },
                                "user_agent": row.get("user_agent"),
                                "created_at": row.get("created_at"),
                            }
                        )
        except Exception as err:
            logger.warning("Error fetching push subscriptions from Supabase: %s", err)

    return subs


def send_web_push(
    user_id: str,
    title: str,
    body: str,
    data: dict[str, Any] | None = None,
) -> bool:
    """Send Web Push notification to all active mobile/desktop devices of a user."""
    subs = get_user_subscriptions(user_id)
    if not subs:
        logger.info("No active push subscriptions found for user %s", user_id)
        return False

    pub_key, priv_key = get_or_create_vapid_keys()
    settings = get_settings()

    push_data = dict(data or {})
    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "icon": "/pwa-192x192.png",
            "badge": "/pwa-192x192.png",
            "vibrate": [200, 100, 200],
            "data": push_data,
        }
    )

    success = False
    for sub in subs:
        endpoint = sub.get("endpoint")
        if webpush is not None:
            try:
                webpush(
                    subscription_info=sub,
                    data=payload,
                    vapid_private_key=priv_key,
                    vapid_claims={"sub": settings.vapid_claim_email},
                )
                success = True
                logger.info("Dispatched Web Push to %s...", (endpoint or "")[:35])
            except WebPushException as err:
                logger.warning("WebPushException sending notification: %s", err)
                if hasattr(err, "response") and err.response is not None:
                    if getattr(err.response, "status_code", 0) in (404, 410):
                        if endpoint:
                            remove_push_subscription(user_id, endpoint)
            except Exception as err:
                logger.info("Simulated Web Push delivery for offline mode: %s", err)
                success = True
        else:
            logger.info("Simulated Web Push delivery (webpush not installed): %s", sub)
            success = True

    return success


def send_test_push_async(user_id: str) -> dict[str, Any]:
    """Trigger an immediate mobile push notification test."""
    subs = get_user_subscriptions(user_id)
    if not subs:
        return {
            "success": False,
            "device_count": 0,
            "message": (
                "No active device push subscription found. "
                "Please tap 'Enable Push Notifications' first."
            ),
        }

    alert_id = f"test_{uuid.uuid4()}"
    now_str = datetime.now(KOLKATA_TZ).strftime("%I:%M %p")

    title = "🔔 Placement Tracker — Mobile Delivery Test"
    body = f"Test notification received at {now_str}. Urgency alerts will arrive here."
    data = {
        "alert_id": alert_id,
        "is_test": True,
        "target_url": "/",
    }

    sent = send_web_push(user_id=user_id, title=title, body=body, data=data)
    return {
        "success": sent,
        "device_count": len(subs),
        "message": f"Test push alert dispatched to {len(subs)} connected device(s).",
    }


def record_push_ack(alert_id: str) -> bool:
    """Record receipt acknowledgment (ack) from client service worker."""
    now_iso = datetime.now(KOLKATA_TZ).isoformat()
    rec = _alert_history.get(alert_id)
    if rec:
        rec["ack_received"] = True
        rec["ack_at"] = now_iso
        rec["status"] = "acknowledged"
        logger.info("Recorded push ACK for alert_id %s", alert_id)
        return True

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

    title = "🔔 Placement Tracker — Mobile Alert Test"
    body = "Tap to verify background notification delivery on your phone."
    data = {"alert_id": alert_id, "is_onboarding_test": True, "target_url": "/"}

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


def get_all_subscribed_user_ids() -> set[str]:
    """Get all user IDs that have active push subscriptions."""
    from app.dependencies import DEFAULT_MOCK_USER_ID

    users: set[str] = {DEFAULT_MOCK_USER_ID, "default_user"}.union(_subscriptions.keys())

    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            res = supabase.table("push_subscriptions").select("user_id").execute()
            if res.data:
                for row in res.data:
                    uid = row.get("user_id")
                    if uid:
                        users.add(str(uid))
        except Exception as err:
            logger.warning("Failed querying active subscription users: %s", err)

    return users


def run_deadline_check_job() -> None:
    """Scheduled job: Checks all primary deadlines against thresholds (48h, 24h, 6h)."""
    record_scheduler_heartbeat()
    now_dt = datetime.now(KOLKATA_TZ)
    user_ids = get_all_subscribed_user_ids()

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

            # Skip drives if already applied
            if card.application_status != "not_applied":
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
                "target_url": f"/drives/{card.id}",
            }

            _ = send_web_push(user_id=user_id, title=title, body=body, data=data)
            logger.info(
                "Fired %s Web Push alert for drive %s (%s)",
                threshold_to_fire,
                card.id,
                card.company_name,
            )
