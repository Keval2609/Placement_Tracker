"""LLM Provider abstraction, PII safety guard, schema-constrained decoding, and retry logic.

(PRD Section 3.1, 3.2, 3.3 & 3.4)
"""

import json
import logging
import re
import zoneinfo
from datetime import datetime

import httpx
from pydantic import ValidationError

from app.config import Settings, get_settings
from app.models.extraction import ExtractionResult, UpdateResult
from app.services.prompts import DIFF_SYSTEM_PROMPT, EXTRACTION_SYSTEM_PROMPT

logger = logging.getLogger(__name__)

KOLKATA_TZ = zoneinfo.ZoneInfo("Asia/Kolkata")
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


def _clean_json_string(raw: str) -> str:
    """Clean markdown fences and whitespace from raw LLM output."""
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()
    return cleaned


def normalize_extraction_payload(
    data: object,
    raw_text: str = "",
    reference_date_iso: str = "",
) -> dict:
    """Normalize arbitrary LLM JSON output to match ExtractionResult schema.

    Handles single-object unnested responses, field key aliases (job_title, role,
    type), and ensures dates array is well-formed.
    """
    if isinstance(data, list):
        payload = {"postings": data}
    elif isinstance(data, dict):
        if "postings" not in data:
            payload = {"postings": [data]}
        elif not isinstance(data["postings"], list):
            payload = {"postings": [data["postings"]]}
        else:
            payload = data
    else:
        payload = {"postings": []}

    ref_iso = reference_date_iso or datetime.now(KOLKATA_TZ).isoformat()
    valid_date_types = {
        "application_deadline",
        "oa",
        "interview",
        "ppt",
        "result",
        "joining",
        "other",
    }

    normalized_postings = []
    for item in payload.get("postings", []):
        if not isinstance(item, dict):
            continue

        posting = dict(item)

        # Normalize role_title
        if not posting.get("role_title"):
            posting["role_title"] = (
                posting.get("job_title")
                or posting.get("role")
                or posting.get("position")
                or posting.get("title")
                or "Full Time Position"
            )

        # Normalize company_name
        if not posting.get("company_name"):
            posting["company_name"] = (
                posting.get("company")
                or posting.get("organization")
                or "Unknown Company"
            )

        # Normalize dates
        raw_dates = posting.get("dates")
        if not isinstance(raw_dates, list):
            raw_dates = []

        norm_dates = []
        for d in raw_dates:
            if not isinstance(d, dict):
                continue
            date_dict = dict(d)
            dtype = (
                date_dict.get("date_type")
                or date_dict.get("type")
                or date_dict.get("category")
                or "application_deadline"
            )
            if dtype not in valid_date_types:
                dtype = "other"
            date_dict["date_type"] = dtype
            date_dict["label"] = date_dict.get("label") or None
            date_dict["date_raw"] = str(
                date_dict.get("date_raw")
                or date_dict.get("date")
                or date_dict.get("label")
                or "Deadline announced"
            )

            date_iso = date_dict.get("date_iso")
            if not date_iso or not isinstance(date_iso, str) or len(date_iso) < 10:
                date_iso = ref_iso
            date_dict["date_iso"] = str(date_iso)
            norm_dates.append(date_dict)

        if not norm_dates:
            norm_dates.append({
                "date_type": "application_deadline",
                "label": "Registration Deadline",
                "date_iso": ref_iso,
                "date_raw": "See announcement notice",
            })

        posting["dates"] = norm_dates

        # Normalize eligibility_raw
        if not posting.get("eligibility_raw"):
            posting["eligibility_raw"] = (
                posting.get("eligibility")
                or posting.get("description")
                or posting.get("job_description")
                or (raw_text if len(raw_text) < 1500 else raw_text[:1500] + "...")
            )

        # Normalize eligible_branches
        branches = posting.get("eligible_branches")
        if isinstance(branches, str):
            posting["eligible_branches"] = [
                b.strip() for b in branches.split(",") if b.strip()
            ]
        elif not isinstance(branches, list):
            posting["eligible_branches"] = []

        # Normalize min_cgpa
        cgpa_val = posting.get("min_cgpa")
        if cgpa_val is not None:
            try:
                posting["min_cgpa"] = float(cgpa_val)
            except (ValueError, TypeError):
                posting["min_cgpa"] = None

        normalized_postings.append(posting)

    payload["postings"] = normalized_postings
    return payload


def _heuristic_fallback_extraction(
    raw_text: str,
    reference_date_iso: str,
) -> ExtractionResult:
    """Fallback extractor if AI provider is unavailable or output cannot be decoded."""
    lines = [line.strip() for line in raw_text.splitlines() if line.strip()]
    company_name = "Placement Drive"
    role_title = "Full Time Position"
    app_link = None

    url_match = re.search(r"https?://[^\s\"'<>]+", raw_text)
    if url_match:
        app_link = url_match.group(0).rstrip(".,)")

    for line in lines[:6]:
        cleaned = line.strip("*_:#- ")
        match = re.search(
            r"(?:CAMPUS|RECRUITMENT|DRIVE|FOR)\s*[-:]?\s*([A-Za-z0-9\s&.]+)",
            cleaned,
            re.IGNORECASE,
        )
        if match and len(match.group(1).strip()) > 2:
            company_name = match.group(1).strip()
            break
        elif any(kw in cleaned.lower() for kw in ["hiring", "visiting", "drive"]):
            words = cleaned.split()
            if words and len(words[0]) > 2:
                company_name = words[0].strip("*_:#")
                break

    for line in lines:
        lower = line.lower()
        if "role:" in lower or "position:" in lower or "profile:" in lower:
            parts = re.split(r"[:\-]", line, maxsplit=1)
            if len(parts) > 1 and parts[1].strip():
                role_title = parts[1].strip("*_ ")
                break

    ref_iso = reference_date_iso or datetime.now(KOLKATA_TZ).isoformat()
    posting = {
        "company_name": company_name,
        "role_title": role_title,
        "eligibility_raw": raw_text,
        "min_cgpa": None,
        "eligible_branches": [],
        "application_link": app_link,
        "dates": [
            {
                "date_type": "application_deadline",
                "label": "Registration Deadline",
                "date_iso": ref_iso,
                "date_raw": "Check announcement text",
            }
        ],
    }
    return ExtractionResult.model_validate({"postings": [posting]})


def extract_with_retry(
    raw_text: str,
    reference_date_iso: str,
    provider: str | None = None,
    max_retries: int = 1,
    settings: Settings | None = None,
) -> tuple[ExtractionResult, str, str | None]:
    """Execute AI extraction with schema-constrained decoding and retry logic.

    Returns:
        (ExtractionResult, status, error_message)
    """
    system_prompt = EXTRACTION_SYSTEM_PROMPT.format(reference_date=reference_date_iso)
    last_error: str | None = None

    for attempt in range(max_retries + 1):
        try:
            raw_output = call_llm(
                system_prompt=system_prompt,
                raw_text=raw_text,
                provider=provider,
                settings=settings,
                schema_dict=ExtractionResult.model_json_schema(),
            )
            cleaned_json = _clean_json_string(raw_output)
            parsed_dict = json.loads(cleaned_json)
            normalized_dict = normalize_extraction_payload(
                parsed_dict,
                raw_text=raw_text,
                reference_date_iso=reference_date_iso,
            )
            result = ExtractionResult.model_validate(normalized_dict)

            if result.postings:
                return result, "success", None
            last_error = "LLM returned empty postings list."
        except (
            ValidationError,
            ValueError,
            httpx.HTTPError,
            json.JSONDecodeError,
            Exception,
        ) as err:

            last_error = str(err)

            logger.warning(
                "Extraction attempt %d/%d failed: %s",
                attempt + 1,
                max_retries + 1,
                last_error,
            )

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
