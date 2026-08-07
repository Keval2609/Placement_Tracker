"""FastAPI application entrypoint with APScheduler background jobs."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler
except ImportError:
    AsyncIOScheduler = None  # type: ignore[assignment,misc]

from app.config import get_settings
from app.routers import alerts, applications, drives, ingest
from app.services.alert_service import run_deadline_check_job, run_escalation_job

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

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(ingest.router)
app.include_router(drives.router)
app.include_router(applications.router)
app.include_router(alerts.router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}
