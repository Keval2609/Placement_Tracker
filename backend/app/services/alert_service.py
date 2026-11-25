"""Web Push (pywebpush + VAPID) notification engine.

Handles:
1. VAPID keypair retrieval (fail-closed in prod; auto-generate only in TESTING=1).
2. Storing and removing mobile/desktop Web Push subscriptions in Supabase `push_subscriptions`.
3. Persistent `alert_log` (keyed by drive_id, threshold, deadline_iso) and `push_test_log`.
4. APScheduler background job:
   - `run_deadline_check_job`: Triggers Web Push at 48h, 24h, and 6h to primary deadline.
   - Marks a threshold as fired ONLY after `send_web_push` succeeds.
5. Client receipt acknowledgment (POST /push/ack) and onboarding self-test.
"""

import json
import logging
import os
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

# Testing-only VAPID keypair cache and in-memory stores
_generated_vapid: Any = None
_vapid_public_key: str | None = None
_vapid_private_key: str | None = None

_subscriptions: dict[str, list[dict[str, Any]]] = {}
_alert_history: dict[str, dict[str, Any]] = {}
_fired_thresholds: set[str] = set()
_onboarding_tests: dict[str, dict[str, Any]] = {}
_last_scheduler_heartbeat: datetime | None = None


def _is_testing() -> bool:
    return os.environ.get("TESTING") == "1"


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
    """Retrieve configured VAPID keypair; auto-generate only when TESTING=1."""
    global _generated_vapid, _vapid_public_key, _vapid_private_key

    settings = get_settings()
    if settings.vapid_public_key and settings.vapid_private_key:
        return settings.vapid_public_key, settings.vapid_private_key

    if not _is_testing():
        raise RuntimeError(
            "VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be configured in production."
        )

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
            logger.info("Auto-generated in-memory VAPID keypair for testing.")
            return _vapid_public_key, _vapid_private_key
        except Exception as err:
            logger.warning("Could not auto-generate VAPID keys: %s", err)

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
    configured = bool(settings.supabase_url and settings.supabase_service_role_key)
    if not configured and not _is_testing():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database is not configured.",
        )
    return configured


def save_push_subscription(
    user_id: str,
    subscription: dict[str, Any],
    user_agent: str | None = None,
) -> None:
    """Store web push subscription for user in Supabase (in-memory only in TESTING=1)."""
    endpoint = subscription.get("endpoint")
    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Subscription endpoint is missing.",
        )

    keys = subscription.get("keys", {})
    p256dh = keys.get("p256dh", "")
    auth_key = keys.get("auth", "")

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
            return
        except Exception as err:
            logger.error("Failed to persist push subscription to Supabase: %s", err)
            if not _is_testing():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to save push subscription.",
                ) from err

    if user_id not in _subscriptions:
        _subscriptions[user_id] = []
    _subscriptions[user_id] = [
        s for s in _subscriptions[user_id] if s.get("endpoint") != endpoint
    ]
    _subscriptions[user_id].append(
        {
            "endpoint": endpoint,
            "keys": {"p256dh": p256dh, "auth": auth_key},
            "user_agent": user_agent,
            "created_at": datetime.now(KOLKATA_TZ).isoformat(),
        }
    )


def remove_push_subscription(user_id: str, endpoint: str) -> None:
    """Remove a push subscription when unsubscribed or expired."""
    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            (
                supabase.table("push_subscriptions")
                .delete()
                .eq("endpoint", endpoint)
                .eq("user_id", user_id)
                .execute()
            )
            logger.info("Removed push subscription for endpoint: %s", endpoint[:30])
            return
        except Exception as err:
            logger.error("Failed removing push subscription from Supabase: %s", err)
            if not _is_testing():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to remove push subscription.",
                ) from err

    if user_id in _subscriptions:
        _subscriptions[user_id] = [
            s for s in _subscriptions[user_id] if s.get("endpoint") != endpoint
        ]


def get_user_subscriptions(user_id: str) -> list[dict[str, Any]]:
    """Retrieve all active push subscriptions for a user."""
    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            res = (
                supabase.table("push_subscriptions")
                .select("*")
                .eq("user_id", user_id)
                .execute()
            )
            return [
                {
                    "endpoint": row.get("endpoint"),
                    "keys": {
                        "p256dh": row.get("p256dh", ""),
                        "auth": row.get("auth_key", ""),
                    },
                    "user_agent": row.get("user_agent"),
                    "created_at": row.get("created_at"),
                }
                for row in (res.data or [])
                if row.get("endpoint")
            ]
        except Exception as err:
            logger.error("Error fetching push subscriptions from Supabase: %s", err)
            if not _is_testing():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed fetching push subscriptions.",
                ) from err

    return list(_subscriptions.get(user_id, []))


def _build_vapid_arg(priv_key: str) -> Any:
    """Convert PEM private key string to pywebpush Vapid object when applicable."""
    if Vapid is not None and "BEGIN" in priv_key:
        return Vapid.from_pem(priv_key.encode("utf-8"))
    return priv_key


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

    if webpush is None or Vapid is None:
        if _is_testing():
            logger.info("Simulated Web Push delivery (TESTING=1, pywebpush unavailable)")
            return True
        raise RuntimeError("pywebpush/Vapid is required for Web Push delivery in production.")

    _pub_key, priv_key = get_or_create_vapid_keys()
    settings = get_settings()
    vapid_arg = _build_vapid_arg(priv_key)

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
        try:
            webpush(
                subscription_info=sub,
                data=payload,
                vapid_private_key=vapid_arg,
                vapid_claims={"sub": settings.vapid_claim_email},
            )
            success = True
            logger.info("Dispatched Web Push to %s...", (endpoint or "")[:35])
        except WebPushException as err:
            logger.warning("WebPushException sending notification: %s", err)
            if hasattr(err, "response") and err.response is not None:
                if getattr(err.response, "status_code", 0) in (404, 410) and endpoint:
                    remove_push_subscription(user_id, endpoint)
        except Exception as err:
            logger.error("Unexpected error sending Web Push to %s: %s", (endpoint or "")[:35], err)

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
    if _is_supabase_configured() and sent:
        try:
            supabase = get_service_client()
            supabase.table("push_test_log").insert(
                {
                    "test_id": alert_id,
                    "user_id": user_id,
                    "kind": "test",
                    "status": "push_sent",
                }
            ).execute()
        except Exception as err:
            logger.warning("Failed logging test push to push_test_log: %s", err)

    return {
        "success": sent,
        "device_count": len(subs),
        "message": (
            f"Test push alert dispatched to {len(subs)} connected device(s)."
            if sent
            else "Failed delivering test push alert to connected device(s)."
        ),
    }


def record_push_ack(alert_id: str) -> bool:
    """Record receipt acknowledgment (ack) from client service worker."""
    now_iso = datetime.now(KOLKATA_TZ).isoformat()

    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            if alert_id.startswith("test_"):
                res = (
                    supabase.table("push_test_log")
                    .update({"ack_received": True, "ack_at": now_iso, "status": "acknowledged"})
                    .eq("test_id", alert_id)
                    .execute()
                )
                if res.data:
                    return True
            else:
                res = (
                    supabase.table("alert_log")
                    .update({"ack_received": True, "ack_at": now_iso, "status": "acknowledged"})
                    .eq("id", alert_id)
                    .execute()
                )
                if res.data:
                    return True
        except Exception as err:
            logger.error("Failed recording push ACK in Supabase: %s", err)
            if not _is_testing():
                return False

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

    title = "🔔 Placement Tracker — Mobile Alert Test"
    body = "Tap to verify background notification delivery on your phone."
    data = {"alert_id": alert_id, "is_onboarding_test": True, "target_url": "/"}

    sent = send_web_push(user_id=user_id, title=title, body=body, data=data)

    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            supabase.table("push_test_log").insert(
                {
                    "test_id": alert_id,
                    "user_id": user_id,
                    "kind": "onboarding",
                    "status": "push_sent" if sent else "failed",
                    "push_sent_at": now_iso,
                    "ack_received": False,
                }
            ).execute()
        except Exception as err:
            logger.error("Failed persisting onboarding test to Supabase: %s", err)
            if not _is_testing():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed recording onboarding test.",
                ) from err
    else:
        _onboarding_tests[user_id] = {
            "test_id": alert_id,
            "alert_id": alert_id,
            "user_id": user_id,
            "status": "push_sent" if sent else "failed",
            "push_sent_at": now_iso,
            "ack_received": False,
            "ack_at": None,
        }

    return {
        "test_id": alert_id,
        "sent": sent,
        "message": (
            "Onboarding push notification sent."
            if sent
            else "Onboarding push notification failed to send."
        ),
        "push_sent_at": now_iso,
    }


def get_onboarding_test_status(user_id: str) -> dict[str, Any]:
    """Check status of onboarding self-test push. Returns show_oem_warning if unacknowledged."""
    test_rec: dict[str, Any] | None = None

    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            res = (
                supabase.table("push_test_log")
                .select("*")
                .eq("user_id", user_id)
                .eq("kind", "onboarding")
                .order("push_sent_at", desc=True)
                .limit(1)
                .execute()
            )
            if res.data:
                test_rec = res.data[0]
        except Exception as err:
            logger.error("Failed querying onboarding test status from Supabase: %s", err)
            if not _is_testing():
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed querying onboarding test status.",
                ) from err
    else:
        test_rec = _onboarding_tests.get(user_id)

    if not test_rec:
        return {
            "has_tested": False,
            "ack_received": False,
            "show_oem_warning": False,
        }

    ack_received = bool(test_rec.get("ack_received", False))
    return {
        "has_tested": True,
        "test_id": test_rec["test_id"],
        "ack_received": ack_received,
        "show_oem_warning": not ack_received,
        "push_sent_at": test_rec.get("push_sent_at"),
    }


def get_all_subscribed_user_ids() -> set[str]:
    """Get all user IDs that have active push subscriptions."""
    if _is_supabase_configured():
        try:
            supabase = get_service_client()
            res = supabase.table("push_subscriptions").select("user_id").execute()
            return {str(row["user_id"]) for row in (res.data or []) if row.get("user_id")}
        except Exception as err:
            logger.error("Failed querying active subscription users: %s", err)
            if not _is_testing():
                return set()

    from app.dependencies import DEFAULT_MOCK_USER_ID

    return {DEFAULT_MOCK_USER_ID, "default_user"}.union(_subscriptions.keys())


def _has_threshold_fired(
    drive_id: str,
    threshold: str,
    deadline_iso: str,
    use_supabase: bool,
) -> bool:
    if use_supabase:
        try:
            supabase = get_service_client()
            res = (
                supabase.table("alert_log")
                .select("id")
                .eq("drive_id", drive_id)
                .eq("threshold", threshold)
                .eq("deadline_iso", deadline_iso)
                .execute()
            )
            return bool(res.data)
        except Exception as err:
            logger.warning("Failed checking alert_log for %s/%s: %s", drive_id, threshold, err)
            return False

    return f"{drive_id}_{threshold}_{deadline_iso}" in _fired_thresholds


def _record_fired_threshold(
    alert_id: str,
    user_id: str,
    drive_id: str,
    company_name: str,
    role_title: str,
    threshold: str,
    deadline_iso: str,
    now_iso: str,
    use_supabase: bool,
) -> None:
    if use_supabase:
        try:
            supabase = get_service_client()
            supabase.table("alert_log").insert(
                {
                    "id": alert_id,
                    "drive_id": drive_id,
                    "user_id": user_id,
                    "threshold": threshold,
                    "deadline_iso": deadline_iso,
                    "status": "push_sent",
                    "push_sent_at": now_iso,
                    "ack_received": False,
                }
            ).execute()
            return
        except Exception as err:
            logger.error("Failed inserting into alert_log: %s", err)
            return

    _alert_history[alert_id] = {
        "alert_id": alert_id,
        "user_id": user_id,
        "drive_id": drive_id,
        "company_name": company_name,
        "role_title": role_title,
        "threshold": threshold,
        "deadline_iso": deadline_iso,
        "status": "push_sent",
        "push_sent_at": now_iso,
        "ack_received": False,
        "ack_at": None,
    }
    _fired_thresholds.add(f"{drive_id}_{threshold}_{deadline_iso}")


def run_deadline_check_job() -> None:
    """Scheduled job: Checks all primary deadlines against thresholds (48h, 24h, 6h)."""
    record_scheduler_heartbeat()
    now_dt = datetime.now(KOLKATA_TZ)
    user_ids = get_all_subscribed_user_ids()
    use_supabase = _is_supabase_configured()

    for user_id in user_ids:
        try:
            drive_list = list_drives_for_dashboard(user_id=user_id)
        except Exception as err:
            logger.warning(
                "Error listing drives during deadline check for user %s: %s", user_id, err
            )
            continue

        for card in drive_list.drives:
            if card.is_overdue or not card.primary_deadline_iso:
                continue

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

            if _has_threshold_fired(
                card.id, threshold_to_fire, card.primary_deadline_iso, use_supabase
            ):
                continue

            alert_id = str(uuid.uuid4())
            now_iso = now_dt.isoformat()

            title = f"⏰ {card.company_name} Deadline Alert ({threshold_to_fire} left)"
            body = (
                f"Application deadline for {card.role_title} "
                f"is approaching in {threshold_to_fire}."
            )
            data = {
                "alert_id": alert_id,
                "drive_id": card.id,
                "threshold": threshold_to_fire,
                "target_url": f"/?drive={card.id}",
            }

            sent = send_web_push(user_id=user_id, title=title, body=body, data=data)
            if sent:
                _record_fired_threshold(
                    alert_id=alert_id,
                    user_id=user_id,
                    drive_id=card.id,
                    company_name=card.company_name,
                    role_title=card.role_title,
                    threshold=threshold_to_fire,
                    deadline_iso=card.primary_deadline_iso,
                    now_iso=now_iso,
                    use_supabase=use_supabase,
                )
                logger.info(
                    "Fired %s Web Push alert for drive %s (%s)",
                    threshold_to_fire,
                    card.id,
                    card.company_name,
                )
            else:
                logger.warning(
                    "Skipped recording %s alert for drive %s because push delivery failed.",
                    threshold_to_fire,
                    card.id,
                )
