"""FastAPI application entrypoint with APScheduler background jobs."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except ImportError:
    AsyncIOScheduler = None  # type: ignore[assignment,misc]

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.limiter import limiter
from app.logging_config import setup_logging
from app.middleware import RequestLoggingMiddleware
from app.routers import alerts, applications, drives, ingest
from app.sentry_setup import init_sentry
from app.services.alert_service import (
    get_scheduler_health,
    run_deadline_check_job,
    run_escalation_job,
)

setup_logging()
init_sentry()

logger = logging.getLogger(__name__)
settings = get_settings()
scheduler = AsyncIOScheduler() if AsyncIOScheduler is not None else None


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Lifespan manager starting APScheduler background jobs for alerts & escalations."""
    if scheduler is not None:
        scheduler.add_job(run_deadline_check_job, "interval", minutes=5, id="deadline_check")
        scheduler.add_job(run_escalation_job, "interval", minutes=1, id="escalation_check")
        scheduler.start()
        logger.info("APScheduler started for deadline checks & escalations.")
    yield
    if scheduler is not None and getattr(scheduler, "running", False):
        scheduler.shutdown()


app = FastAPI(
    title="Placement Tracker API",
    version="0.1.0",
    lifespan=lifespan,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(drives.router)
app.include_router(applications.router)
app.include_router(alerts.router)


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint providing service status and API documentation links."""
    return {
        "message": "Placement Tracker API is running",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}


@app.get("/health/scheduler")
async def scheduler_health() -> dict[str, Any]:
    """Uptime health check endpoint specifically monitoring the alert scheduler heartbeat."""
    is_healthy, details = get_scheduler_health(max_stale_seconds=900)
    if not is_healthy:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=details,
        )
    return details


@app.get("/sentry-debug")
async def sentry_debug() -> None:
    """Deliberately trigger a caught/unhandled exception for Sentry error verification."""
    _ = 1 / 0


