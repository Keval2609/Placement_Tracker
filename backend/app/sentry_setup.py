"""Sentry Error Tracking Initialization."""

import logging

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

from app.config import get_settings

logger = logging.getLogger(__name__)


def init_sentry() -> None:
    """Initialize Sentry SDK if SENTRY_DSN is configured."""
    settings = get_settings()
    dsn = settings.sentry_dsn.strip()
    if not dsn:
        logger.info("Sentry DSN not provided; Sentry initialization skipped.")
        return

    sentry_sdk.init(
        dsn=dsn,
        integrations=[FastApiIntegration()],
        send_default_pii=True,
        enable_logs=True,
        traces_sample_rate=1.0,
        profile_session_sample_rate=1.0,
        profile_lifecycle="trace",
    )
    logger.info("Sentry SDK initialized successfully.")
