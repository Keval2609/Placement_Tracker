"""FastAPI router for Web Push (VAPID), Push Subscription Management, ACKs, and Testing."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, Header, status
from pydantic import BaseModel

from app.dependencies import get_current_user_id
from app.services.alert_service import (
    get_onboarding_test_status,
    get_user_subscriptions,
    get_vapid_public_key,
    record_push_ack,
    remove_push_subscription,
    save_push_subscription,
    send_test_push_async,
    trigger_onboarding_test,
)

router = APIRouter(prefix="", tags=["Alerts"])


class PushSubscriptionRequest(BaseModel):
    """Client Web Push subscription payload from registration.pushManager.subscribe()."""

    endpoint: str
    expirationTime: float | None = None
    keys: dict[str, str]


class PushUnsubscribeRequest(BaseModel):
    """Client Web Push unsubscription payload."""

    endpoint: str


class PushAckRequest(BaseModel):
    """Payload for client receipt acknowledgment of Web Push notification."""

    alert_id: str


@router.get(
    "/push/vapid-public-key",
    status_code=status.HTTP_200_OK,
    summary="Get public VAPID key for Web Push subscription",
)
async def fetch_vapid_public_key() -> dict[str, str]:
    return {"public_key": get_vapid_public_key()}


@router.post(
    "/push/subscribe",
    status_code=status.HTTP_200_OK,
    summary="Register Web Push subscription for current user",
)
async def subscribe_push(
    payload: PushSubscriptionRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
    user_agent: Annotated[str | None, Header(alias="user-agent")] = None,
) -> dict[str, str]:
    save_push_subscription(
        user_id=user_id,
        subscription=payload.model_dump(),
        user_agent=user_agent,
    )
    return {"message": "Push subscription saved successfully"}


@router.post(
    "/push/unsubscribe",
    status_code=status.HTTP_200_OK,
    summary="Unregister Web Push subscription for current device",
)
async def unsubscribe_push(
    payload: PushUnsubscribeRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, str]:
    remove_push_subscription(user_id=user_id, endpoint=payload.endpoint)
    return {"message": "Push subscription removed successfully"}


@router.get(
    "/push/status",
    status_code=status.HTTP_200_OK,
    summary="Get push notification subscription count and status for current user",
)
async def fetch_push_status(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, Any]:
    subs = get_user_subscriptions(user_id=user_id)
    return {
        "is_enabled": len(subs) > 0,
        "device_count": len(subs),
    }


@router.post(
    "/push/test",
    status_code=status.HTTP_200_OK,
    summary="Trigger immediate mobile verification push notification",
)
async def trigger_test_push_notification(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, Any]:
    return send_test_push_async(user_id=user_id)


@router.post(
    "/push/ack",
    status_code=status.HTTP_200_OK,
    summary="Acknowledge receipt of Web Push notification",
)
async def acknowledge_push(
    payload: PushAckRequest,
) -> dict[str, Any]:
    success = record_push_ack(alert_id=payload.alert_id)
    return {"acknowledged": success, "alert_id": payload.alert_id}


@router.post(
    "/push/onboarding-test",
    status_code=status.HTTP_200_OK,
    summary="Trigger onboarding self-test push notification",
)
async def trigger_test_push(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, Any]:
    return trigger_onboarding_test(user_id=user_id)


@router.get(
    "/push/onboarding-test/status",
    status_code=status.HTTP_200_OK,
    summary="Get status of onboarding self-test push notification",
)
async def fetch_test_push_status(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, Any]:
    return get_onboarding_test_status(user_id=user_id)
