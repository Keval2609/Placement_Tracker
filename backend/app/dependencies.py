"""FastAPI request dependencies (auth user resolution)."""

import logging
import os
from typing import Annotated

import httpx
import jwt
from fastapi import Header, HTTPException

logger = logging.getLogger(__name__)

DEFAULT_MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"

# Lazy-loaded JWKS client
_jwk_client = None


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


def get_jwk_client():
    global _jwk_client

    if _jwk_client is None:
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
        except Exception as exc:
            logger.error("Failed to fetch Clerk JWKS from %s: %s", url, exc)
            raise

    return _jwk_client


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """Extract and verify authenticated user ID from Clerk JWT Authorization header."""
    if x_user_id and os.environ.get("ENVIRONMENT") == "development":
        return x_user_id

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing Authorization Bearer token",
        )

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    try:
        global _jwk_client
        jwk_client = get_jwk_client()

        try:
            signing_key = jwk_client.get_signing_key_from_jwt(token)
        except jwt.PyJWKClientError:
            # Re-fetch once in case keys were rotated
            logger.info("Key not found in cached JWKS, refreshing from Clerk...")
            _jwk_client = None
            jwk_client = get_jwk_client()
            signing_key = jwk_client.get_signing_key_from_jwt(token)

        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False},
        )
        return str(payload.get("sub"))

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
