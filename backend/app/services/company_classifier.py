"""Company classification service.

Provides lightweight company-type classification:
1. Static lookup seed list of ~35+ well-known Indian product/startup, service, and PSU companies.
2. LLM fallback classification for unknown company names.
"""

import json
import logging
from typing import Literal

from app.config import Settings, get_settings

logger = logging.getLogger(__name__)

CompanyType = Literal["product", "startup", "service", "psu", "unknown"]

SEED_COMPANY_TYPE_MAP: dict[str, CompanyType] = {
    # Service Companies
    "tcs": "service",
    "tata consultancy services": "service",
    "infosys": "service",
    "wipro": "service",
    "accenture": "service",
    "cognizant": "service",
    "capgemini": "service",
    "ltimindtree": "service",
    "mindtree": "service",
    "tech mahindra": "service",
    "hcltech": "service",
    "hcl technologies": "service",
    "hexaware": "service",
    "dxc technology": "service",
    "mphasis": "service",
    "persistent systems": "service",
    "l&t technology services": "service",
    "coforge": "service",
    "kpit": "service",
    # Product / Startup Companies
    "google": "product",
    "microsoft": "product",
    "amazon": "product",
    "flipkart": "startup",
    "swiggy": "startup",
    "zomato": "startup",
    "razorpay": "startup",
    "cred": "startup",
    "phonepe": "startup",
    "paytm": "startup",
    "meesho": "startup",
    "urban company": "startup",
    "ola": "startup",
    "zepto": "startup",
    "inmobi": "startup",
    "postman": "startup",
    "browserstack": "startup",
    "freshworks": "product",
    "druva": "product",
    "chargebee": "startup",
    "dunzo": "startup",
    "zerodha": "startup",
    "sharechat": "startup",
    "curefit": "startup",
    "groww": "startup",
    "delhivery": "startup",
    "nykaa": "startup",
    "policybazaar": "startup",
    "dream11": "startup",
    "gupshup": "startup",
    "pine labs": "startup",
    "unacademy": "startup",
    "physicswallah": "startup",
    "makemytrip": "product",
    "atlassian": "product",
    "adobe": "product",
    "uber": "product",
    "salesforce": "product",
    "cisco": "product",
    "nvidia": "product",
    "oracle": "product",
    "goldman sachs": "product",
    "jpmorgan": "product",
    "morgan stanley": "product",
    # PSUs
    "isro": "psu",
    "drdo": "psu",
    "bhel": "psu",
    "ntpc": "psu",
    "ongc": "psu",
    "iocl": "psu",
    "gail": "psu",
    "hpcl": "psu",
    "bpcl": "psu",
    "coal india": "psu",
    "bel": "psu",
    "hal": "psu",
}


def classify_company(
    company_name: str,
    settings: Settings | None = None,
) -> CompanyType:
    """Classify company name into company_type.

    Uses static lookup list first. If unknown, falls back to LLM classification.
    Returns one of: 'product', 'startup', 'service', 'psu', 'unknown'.
    """
    if not company_name:
        return "unknown"

    normalized_name = company_name.strip().lower()

    # 1. Static seed lookup
    if normalized_name in SEED_COMPANY_TYPE_MAP:
        return SEED_COMPANY_TYPE_MAP[normalized_name]

    # Check partial / exact matches after stripping common suffixes
    clean_name = (
        normalized_name.replace("pvt ltd", "")
        .replace("private limited", "")
        .replace("ltd", "")
        .replace("inc", "")
        .replace("corp", "")
        .strip()
    )
    if clean_name in SEED_COMPANY_TYPE_MAP:
        return SEED_COMPANY_TYPE_MAP[clean_name]

    # 2. LLM Fallback for unknown companies
    try:
        from app.services.llm import call_llm

        if settings is None:
            settings = get_settings()

        system_prompt = (
            "You are a strict company classifier for an engineering placement tracker. "
            "Classify the given company name into EXACTLY ONE of these categories: "
            "product, startup, service, psu, unknown. "
            "Return JSON matching: {\"company_type\": \"<category>\"}."
        )

        raw_json = call_llm(
            system_prompt=system_prompt,
            raw_text=company_name,
            settings=settings,
        )
        data = json.loads(raw_json)
        classified_type = data.get("company_type", "").lower().strip()
        if classified_type in {"product", "startup", "service", "psu", "unknown"}:
            return classified_type  # type: ignore[return-value]
    except Exception as err:
        logger.warning(
            "LLM company classification failed for '%s': %s",
            company_name,
            err,
        )

    return "unknown"
