"""LLM Provider abstraction, PII safety guard, schema-constrained decoding, and retry logic.

(PRD Section 3.1, 3.2, 3.3 & 3.4)
"""

import logging

import httpx
from pydantic import ValidationError

from app.config import Settings, get_settings
from app.models.extraction import ExtractionResult, UpdateResult
from app.services.prompts import DIFF_SYSTEM_PROMPT, EXTRACTION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

PII_SAFE_PROVIDERS = {"groq", "ollama"}


def validate_provider_guard(provider: str, contains_personal_data: bool = True) -> None:
    """Enforce PII_SAFE_PROVIDERS guard from PRD Risk Mitigations.

    Gemini must be unreachable for personal data extraction requests.
    """
    if contains_personal_data and provider not in PII_SAFE_PROVIDERS:
        raise ValueError(
            f"{provider} is not approved for personal data — use groq or ollama"
        )


def _call_groq(
    system_prompt: str,
    raw_text: str,
    settings: Settings,
) -> str:
    """Call Groq API using schema-constrained decoding."""
    if not settings.groq_api_key:
        raise ValueError("GROQ_API_KEY is not configured.")

    try:
        from groq import Groq

        client = Groq(api_key=settings.groq_api_key)
        completion = client.chat.completions.create(
            model=settings.groq_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_text},
            ],
            response_format={
                "type": "json_object",
            },
            temperature=0.1,
        )
        content = completion.choices[0].message.content
        if not content:
            raise ValueError("Empty response received from Groq API.")
        return content
    except ImportError:
        # Fallback to direct HTTP request via httpx if groq library not available
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": settings.groq_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": raw_text},
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1,
        }
        with httpx.Client(timeout=30.0) as http_client:
            resp = http_client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"]


def _call_ollama(
    system_prompt: str,
    raw_text: str,
    settings: Settings,
    schema_dict: dict | None = None,
) -> str:
    """Call Ollama API using format parameter for schema-constrained decoding."""
    url = f"{settings.ollama_base_url.rstrip('/')}/api/chat"
    payload = {
        "model": settings.ollama_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": raw_text},
        ],
        "format": schema_dict or ExtractionResult.model_json_schema(),
        "stream": False,
    }
    with httpx.Client(timeout=60.0) as client:
        response = client.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]


def call_llm(
    system_prompt: str,
    raw_text: str,
    provider: str | None = None,
    settings: Settings | None = None,
    schema_dict: dict | None = None,
) -> str:
    """Route LLM call to configured provider after passing PII guard."""
    if settings is None:
        settings = get_settings()
    selected_provider = (provider or settings.llm_provider).lower()

    # Enforce PII guard
    validate_provider_guard(selected_provider, contains_personal_data=True)

    if selected_provider == "groq":
        return _call_groq(system_prompt, raw_text, settings)
    elif selected_provider == "ollama":
        return _call_ollama(system_prompt, raw_text, settings, schema_dict=schema_dict)
    else:
        raise ValueError(f"Unsupported provider: {selected_provider}")


def extract_with_retry(
    raw_text: str,
    reference_date_iso: str,
    provider: str | None = None,
    max_retries: int = 1,
    settings: Settings | None = None,
) -> tuple[ExtractionResult, str, str | None]:
    """Execute AI extraction with retry wrapper (Risk Mitigations & PRD 3.4).

    Returns:
        (ExtractionResult, status, error_message)
    """
    system_prompt = EXTRACTION_SYSTEM_PROMPT.format(reference_date=reference_date_iso)
    last_error: str | None = None

    for attempt in range(max_retries + 1):
        try:
            raw_json = call_llm(
                system_prompt=system_prompt,
                raw_text=raw_text,
                provider=provider,
                settings=settings,
                schema_dict=ExtractionResult.model_json_schema(),
            )
            result = ExtractionResult.model_validate_json(raw_json)
            status = "success" if result.postings else "partial"
            return result, status, None
        except (ValidationError, ValueError, httpx.HTTPError, Exception) as err:
            last_error = str(err)
            logger.warning(
                "Extraction attempt %d/%d failed: %s",
                attempt + 1,
                max_retries + 1,
                last_error,
            )
            if attempt == max_retries:
                return ExtractionResult(postings=[]), "failed", last_error

    return ExtractionResult(postings=[]), "failed", last_error or "Unknown extraction failure"


def extract_update_diff(
    new_raw_text: str,
    existing_drive_summary: str,
    reference_date_iso: str,
    provider: str | None = None,
    max_retries: int = 1,
    settings: Settings | None = None,
) -> tuple[UpdateResult, str, str | None]:
    """Execute AI update diff extraction using PRD Section 3.2 prompt.

    Calculates proposed new dates and field changes given existing drive state summary
    and new raw text.

    Returns:
        (UpdateResult, status, error_message)
    """
    system_prompt = DIFF_SYSTEM_PROMPT.format(
        reference_date=reference_date_iso,
        existing_drive_summary=existing_drive_summary,
        new_raw_text=new_raw_text,
    )
    last_error: str | None = None

    for attempt in range(max_retries + 1):
        try:
            raw_json = call_llm(
                system_prompt=system_prompt,
                raw_text=new_raw_text,
                provider=provider,
                settings=settings,
                schema_dict=UpdateResult.model_json_schema(),
            )
            result = UpdateResult.model_validate_json(raw_json)
            return result, "success", None
        except (ValidationError, ValueError, httpx.HTTPError, Exception) as err:
            last_error = str(err)
            logger.warning(
                "Update diff attempt %d/%d failed: %s",
                attempt + 1,
                max_retries + 1,
                last_error,
            )
            if attempt == max_retries:
                fallback_result = UpdateResult(
                    new_dates=[],
                    field_changes={},
                    summary_of_changes="Failed to extract update diff automatically.",
                )
                return fallback_result, "failed", last_error

    fallback_result = UpdateResult(
        new_dates=[],
        field_changes={},
        summary_of_changes="Failed to extract update diff automatically.",
    )
    return fallback_result, "failed", last_error or "Unknown update diff failure"
