"""Rate Limiter setup using SlowAPI (token-bucket protection for LLM free tier)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
