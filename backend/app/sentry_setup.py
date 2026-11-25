"""Sentry Error Tracking Initialization."""

import logging
from typing import Any

import sentry_sdk
from sentry_sdk.consts import DEFAULT_OPTIONS
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

    options: dict[str, Any] = {
        "dsn": dsn,
        "integrations": [FastApiIntegration()],
        "traces_sample_rate": 0.2,
    }
    optional_options: dict[str, Any] = {
        "send_default_pii": False,
        "enable_logs": True,
        "profile_session_sample_rate": 0.2,
        "profile_lifecycle": "trace",
    }
    for key, val in optional_options.items():
        if key in DEFAULT_OPTIONS:
            options[key] = val

    sentry_sdk.init(**options)
    logger.info("Sentry SDK initialized successfully.")
