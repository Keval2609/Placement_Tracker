"""Rate Limiter setup using SlowAPI (token-bucket protection for LLM free tier)."""

from fastapi import Request
from slowapi import Limiter
from slowapi.util import get_remote_address


def get_rate_limit_key(request: Request) -> str:
    """Key rate limits by authenticated user ID, falling back to client IP."""
    user_id = getattr(request.state, "user_id", None)
    if user_id:
        return f"user:{user_id}"
    return get_remote_address(request)


limiter = Limiter(key_func=get_rate_limit_key)
