"""FastAPI request dependencies (auth user resolution and startup config validation)."""

import logging
import os
import threading
import time
from typing import Annotated

import httpx
import jwt
from fastapi import Header, HTTPException, Request

from app.config import get_settings

logger = logging.getLogger(__name__)

DEFAULT_MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"
JWKS_REFETCH_COOLDOWN_SECONDS = 60.0

# Lazy-loaded JWKS client with cooldown lock
_jwk_client = None
_last_jwks_fetch_ts: float = 0.0
_jwks_lock = threading.Lock()


class StaticJWKClient:
    def __init__(self, jwks: dict):
        self.jwk_set = jwt.PyJWKSet.from_dict(jwks)

    def get_signing_key_from_jwt(self, token: str):
        unverified = jwt.get_unverified_header(token)
        kid = unverified.get("kid")
        if not kid:
            raise jwt.PyJWTError("Token header missing 'kid'")

        for key in self.jwk_set.keys:
            if key.key_id == kid:
                return key

        raise jwt.PyJWKClientError(f"Unable to find a signing key that matches '{kid}'")


def get_jwk_client(force_refresh: bool = False):
    """Return cached JWKS client, respecting cooldown on forced refreshes."""
    global _jwk_client, _last_jwks_fetch_ts

    with _jwks_lock:
        now = time.monotonic()
        if _jwk_client is not None and not force_refresh:
            return _jwk_client

        if force_refresh and _jwk_client is not None:
            if (now - _last_jwks_fetch_ts) < JWKS_REFETCH_COOLDOWN_SECONDS:
                logger.warning("JWKS refetch skipped due to cooldown")
                return _jwk_client

        secret_key = os.environ.get("CLERK_SECRET_KEY")
        if not secret_key:
            logger.error("CLERK_SECRET_KEY environment variable is not set")
            raise ValueError("CLERK_SECRET_KEY is not set")

        url = "https://api.clerk.com/v1/jwks"
        try:
            response = httpx.get(
                url,
                headers={"Authorization": f"Bearer {secret_key}"},
                timeout=10.0,
            )
            response.raise_for_status()
            jwks_data = response.json()
            _jwk_client = StaticJWKClient(jwks_data)
            _last_jwks_fetch_ts = time.monotonic()
        except Exception as exc:
            logger.error("Failed to fetch Clerk JWKS from %s: %s", url, exc)
            raise

    return _jwk_client


def validate_startup_config() -> None:
    """Fail fast at startup in non-test mode if required production secrets are missing."""
    if os.environ.get("TESTING") == "1":
        return

    settings = get_settings()
    missing: list[str] = []
    if not settings.supabase_url.strip():
        missing.append("SUPABASE_URL")
    if not settings.supabase_service_role_key.strip():
        missing.append("SUPABASE_SERVICE_ROLE_KEY")
    if not settings.vapid_public_key.strip():
        missing.append("VAPID_PUBLIC_KEY")
    if not settings.vapid_private_key.strip():
        missing.append("VAPID_PRIVATE_KEY")
    if settings.llm_provider.strip().lower() == "groq" and not settings.groq_api_key.strip():
        missing.append("GROQ_API_KEY")
    if not settings.clerk_issuer.strip():
        missing.append("CLERK_ISSUER")
    if not settings.clerk_authorized_party_list:
        missing.append("CLERK_AUTHORIZED_PARTIES")

    if missing:
        raise RuntimeError(
            f"Missing required production environment variable(s): {', '.join(missing)}"
        )


def get_current_user_id(
    request: Request,
    authorization: Annotated[str | None, Header()] = None,
) -> str:
    """Extract and verify authenticated user ID from Clerk JWT Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization Bearer token",
        )

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    try:
        jwk_client = get_jwk_client()

        try:
            signing_key = jwk_client.get_signing_key_from_jwt(token)
        except jwt.PyJWKClientError:
            logger.info("Key not found in cached JWKS, attempting cooldown-gated refresh...")
            jwk_client = get_jwk_client(force_refresh=True)
            signing_key = jwk_client.get_signing_key_from_jwt(token)

        settings = get_settings()
        if not settings.clerk_issuer or not settings.clerk_authorized_party_list:
            raise HTTPException(status_code=503, detail="Authentication is not configured.")
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=settings.clerk_issuer,
            options={"verify_aud": False},
        )
        if "azp" in payload and payload["azp"] not in settings.clerk_authorized_party_list:
            raise jwt.InvalidTokenError("Unauthorized token origin")
        sub = payload.get("sub")
        if not sub or not isinstance(sub, str):
            raise HTTPException(status_code=401, detail="Token missing valid 'sub' claim")

        request.state.user_id = sub
        return sub

    except HTTPException:
        raise
    except jwt.PyJWTError as exc:
        logger.warning("Invalid JWT token: %s", exc)
        raise HTTPException(
            status_code=401,
            detail=f"Invalid token: {exc}",
        ) from exc
    except Exception as exc:
        logger.error("Authentication failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {exc}",
        ) from None
