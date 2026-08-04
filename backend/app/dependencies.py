"""FastAPI request dependencies (auth user resolution)."""

from typing import Annotated

from fastapi import Header

DEFAULT_MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"


async def get_current_user_id(
    authorization: Annotated[str | None, Header()] = None,
    x_user_id: Annotated[str | None, Header()] = None,
) -> str:
    """Extract authenticated user ID from Authorization header or custom header.

    Falls back to a default mock user UUID for development / testing when no header
    is provided.
    """
    if x_user_id:
        return x_user_id

    if authorization and authorization.startswith("Bearer "):
        token = authorization[7:].strip()
        if token:
            # Decode JWT payload safely without full verification if secret is client-side,
            # or extract sub claim if valid JWT.
            try:
                import jwt

                unverified_claims = jwt.decode(token, options={"verify_signature": False})
                if "sub" in unverified_claims:
                    return str(unverified_claims["sub"])
            except Exception:
                # If token is a raw UUID or unparsed string, return as user_id
                if len(token) >= 32:
                    return token

    return DEFAULT_MOCK_USER_ID
