"""FastAPI request dependencies (auth user resolution)."""

from typing import Annotated

from fastapi import Header

DEFAULT_MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"


import os
import httpx
import jwt
from jwt import PyJWKClient
from fastapi import HTTPException

# Lazy-loaded JWKS client
_jwk_client = None

def get_jwk_client():
    global _jwk_client
    if _jwk_client is None:
        secret_key = os.environ.get("CLERK_SECRET_KEY")
        if not secret_key:
            raise ValueError("CLERK_SECRET_KEY is not set")
        
        # We fetch the JWKS manually once since it requires the secret key for the Clerk Backend API.
        # Alternatively, you can use the Frontend API URL which is public.
        url = "https://api.clerk.com/v1/jwks"
        response = httpx.get(url, headers={"Authorization": f"Bearer {secret_key}"})
        response.raise_for_status()
        jwks_data = response.json()
        
        class StaticJWKClient:
            def __init__(self, jwks):
                self.jwk_set = jwt.PyJWKSet.from_dict(jwks)
            def get_signing_key_from_jwt(self, token):
                unverified = jwt.get_unverified_header(token)
                return self.jwk_set.get(unverified.get("kid"))
        
        _jwk_client = StaticJWKClient(jwks_data)
    return _jwk_client

async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """Extract and verify authenticated user ID from Clerk JWT Authorization header."""
    if x_user_id and os.environ.get("ENVIRONMENT") == "development":
        return x_user_id

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing Authorization Bearer token")

    token = authorization[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Empty token")

    try:
        jwk_client = get_jwk_client()
        signing_key = jwk_client.get_signing_key_from_jwt(token)
        
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            options={"verify_aud": False}
        )
        return str(payload.get("sub"))
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Authentication failed")
