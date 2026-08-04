"""Supabase client factories.

Two clients are exposed:

* ``get_anon_client`` — uses the public anon key. Safe for user-scoped,
  RLS-enforced access.
* ``get_service_client`` — uses the service role key. **Server-side only.**
  It bypasses Row-Level Security and must never be shipped to the frontend.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import get_settings


@lru_cache
def get_anon_client() -> Client:
    """Return a Supabase client authenticated with the public anon key."""
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache
def get_service_client() -> Client:
    """Return a Supabase client authenticated with the service role key.

    Server-side use only — bypasses RLS.
    """
    settings = get_settings()
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
