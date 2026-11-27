"""Application configuration loaded from environment variables."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime settings.

    ``SUPABASE_SERVICE_ROLE_KEY`` is used server-side only and must never be
    exposed to the frontend.
    """

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    clerk_issuer: str = ""
    clerk_authorized_parties: str = ""

    @property
    def clerk_authorized_party_list(self) -> list[str]:
        return [p.strip() for p in self.clerk_authorized_parties.split(",") if p.strip()]

    # LLM Provider Configuration
    llm_provider: str = "groq"
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-20b"
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "qwen2.5:7b"

    # Sentry Error Tracking Configuration
    sentry_dsn: str = ""

    # Web Push VAPID Configuration
    vapid_private_key: str = ""
    vapid_public_key: str = ""
    vapid_claim_email: str = "mailto:admin@placementtracker.app"

    # Comma-separated list of allowed CORS origins for the frontend.
    cors_origins: str = (
        "http://localhost:5173,https://drivetrack.page,https://www.drivetrack.page"
    )

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    """Return a cached ``Settings`` instance."""
    if os.environ.get("TESTING") == "1":
        return Settings(
            _env_file=None,
            supabase_url="",
            supabase_anon_key="",
            supabase_service_role_key="",
            groq_api_key="",
        )
    return Settings()
