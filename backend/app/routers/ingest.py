"""FastAPI router for ingestion endpoints (/ingest/text, /ingest/file)."""

import asyncio
import zoneinfo
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, File, Request, UploadFile, status

from app.dependencies import get_current_user_id
from app.limiter import limiter
from app.models.extraction import ExtractionResult, IngestTextRequest
from app.services.ingestion_logger import log_ingestion_attempt
from app.services.llm import extract_with_retry
from app.services.parsers import MAX_FILE_SIZE_BYTES, validate_and_parse_file

router = APIRouter(prefix="/ingest", tags=["Ingestion"])

KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")


def get_current_reference_date_iso() -> str:
    """Return current timestamp formatted in ISO 8601 with Asia/Kolkata timezone."""
    now_ist = datetime.now(KOLKATA_TZ)
    return now_ist.isoformat()


@router.post(
    "/text",
    response_model=ExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest raw placement text (WhatsApp messages)",
    description=(
        "Accepts raw pasted text, runs AI extraction against the configured LLM provider, "
        "and returns ExtractionResult as JSON. Does NOT write to the database — produces "
        "a draft held client-side pending confirmation."
    ),
)
@limiter.limit("10/minute")
def ingest_text(
    request: Request,
    payload: IngestTextRequest,
    user_id: Annotated[str, Depends(get_current_user_id)],
) -> ExtractionResult:
    request.state.user_id = user_id
    reference_date_iso = get_current_reference_date_iso()
    result, extraction_status, error_msg = extract_with_retry(
        raw_text=payload.text,
        reference_date_iso=reference_date_iso,
    )

    log_ingestion_attempt(
        source_type="whatsapp_text",
        status=extraction_status,
        error_message=error_msg,
    )

    return result


@router.post(
    "/file",
    response_model=ExtractionResult,
    status_code=status.HTTP_200_OK,
    summary="Ingest PDF/DOCX placement document",
    description=(
        "Accepts multipart PDF or DOCX upload (max 10MB). Parses document structure and tables "
        "to plain text, runs AI extraction, and returns ExtractionResult as JSON without "
        "persisting to the database."
    ),
)
@limiter.limit("10/minute")
async def ingest_file(
    request: Request,
    user_id: Annotated[str, Depends(get_current_user_id)],
    file: UploadFile = File(...),
) -> ExtractionResult:
    request.state.user_id = user_id
    content = await file.read(MAX_FILE_SIZE_BYTES + 1)
    parsed_text, source_type = await asyncio.to_thread(
        validate_and_parse_file, file, content
    )

    reference_date_iso = get_current_reference_date_iso()
    result, extraction_status, error_msg = await asyncio.to_thread(
        extract_with_retry,
        raw_text=parsed_text,
        reference_date_iso=reference_date_iso,
    )

    await asyncio.to_thread(
        log_ingestion_attempt,
        source_type=source_type,
        status=extraction_status,
        error_message=error_msg,
    )

    return result
