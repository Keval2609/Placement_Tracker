"""Ingestion attempt logging service (PRD Section 1.3.1 & Schema Section 2.3)."""

import logging

from app.supabase_client import get_service_client

logger = logging.getLogger(__name__)


def log_ingestion_attempt(
    source_type: str,
    status: str,
    error_message: str | None = None,
    drive_id: str | None = None,
) -> None:
    """Write an ingestion attempt log entry into Supabase `ingestion_log` table.

    Failures to record logs (e.g. unconfigured Supabase credentials in tests) are
    caught and logged as warnings so ingestion responses are never blocked.
    """
    try:
        supabase = get_service_client()
        row = {
            "source_type": source_type,
            "status": status,
            "error_message": error_message,
            "drive_id": drive_id,
        }
        supabase.table("ingestion_log").insert(row).execute()
        logger.info("Recorded ingestion_log entry: status=%s source=%s", status, source_type)
    except Exception as err:
        logger.warning("Could not write to ingestion_log table: %s", err)
