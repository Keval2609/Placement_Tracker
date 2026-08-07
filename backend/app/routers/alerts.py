"""FastAPI router for Web Push (VAPID), Telegram Bot linking, ACKs, and Onboarding Self-Test."""

from typing import Annotated, Any

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel

from app.dependencies import get_current_user_id
from app.services.alert_service import (
    get_onboarding_test_status,
    get_telegram_link,
    get_vapid_public_key,
    link_telegram_chat,
    record_push_ack,
    save_push_subscription,
    trigger_onboarding_test,
)

router = APIRouter(prefix="", tags=["Alerts"])


class PushSubscriptionRequest(BaseModel):
    """Client Web Push subscription object from registration.pushManager.subscribe()."""

    endpoint: str
    expirationTime: float | None = None
    keys: dict[str, str]


class TelegramLinkRequest(BaseModel):
    """Payload for linking user's Telegram chat_id."""

    chat_id: str


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
) -> dict[str, str]:
    save_push_subscription(user_id=user_id, subscription=payload.model_dump())
    return {"message": "Push subscription saved successfully"}


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
    "/telegram/link",
    status_code=status.HTTP_200_OK,
    summary="Link Telegram account chat_id for escalation fallback",
)
async def link_telegram(
    payload: TelegramLinkRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, str]:
    link_telegram_chat(user_id=user_id, chat_id=payload.chat_id)
    return {
        "message": f"Telegram chat_id {payload.chat_id} linked successfully.",
        "chat_id": payload.chat_id,
    }


@router.get(
    "/telegram/status",
    status_code=status.HTTP_200_OK,
    summary="Get linked Telegram account status",
)
async def fetch_telegram_status(
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> dict[str, Any]:
    chat_id = get_telegram_link(user_id=user_id)
    return {"is_linked": chat_id is not None, "chat_id": chat_id}


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
