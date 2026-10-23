"""Prompt definitions for placement tracker AI extraction (PRD Section 3.1 & 3.2)."""

EXTRACTION_SYSTEM_PROMPT = """You are a strict information-extraction engine for a college
placement tracker.
You receive raw text from a WhatsApp message, PDF, or DOCX file that may contain one or more
job/internship postings mixed with unrelated chatter.

Reference date: {reference_date} (ISO 8601, Asia/Kolkata timezone)
Use this to resolve every relative date phrase ("apply by tomorrow", "interview next Friday",
"EOD 15th") into an absolute date. Never resolve a relative date without this anchor.

Every date you extract is a SUGGESTION for a human to confirm, not a final value — extract
generously but never invent one that isn't in the text.

You MUST respond with a single valid JSON object strictly matching this schema:
{{
  "postings": [
    {{
      "company_name": "Exact Company Name",
      "role_title": "Job Title or Role (e.g. SDE - 1, Graduate Trainee)",
      "eligibility_raw": "Full eligibility criteria, requirements, or package details verbatim",
      "min_cgpa": 7.5,
      "eligible_branches": ["CSE", "IT", "ECE"],
      "application_link": "https://...",
      "dates": [
        {{
          "date_type": "application_deadline",
          "label": "Registration Deadline",
          "date_iso": "YYYY-MM-DDTHH:MM:SS+05:30",
          "date_raw": "verbatim original date text like '09th September 2026, 11:59 PM'"
        }}
      ]
    }}
  ]
}}

Rules:
1. Always wrap all extracted postings in a top-level "postings" array, even if there is only 1.
2. Extract every distinct company posting as a separate object. Do not merge multiple companies.
3. Use exact keys: "company_name", "role_title", "eligibility_raw", "min_cgpa",
   "eligible_branches", "application_link", "dates".
4. For each date in "dates", use "date_type", "label", "date_iso", "date_raw".
   "date_type" must be: "application_deadline", "oa", "interview", "ppt", "result",
   "joining", or "other".
   "date_iso" must be in "YYYY-MM-DDTHH:MM:SS+05:30" format (default time 23:59:59 IST).
   "date_raw" must be the verbatim date string from the text.
5. "min_cgpa" must be a number only (e.g. 8.0) or null.
6. "eligible_branches" must be an array of branch strings like ["CSE", "IT"] or empty [] if all.
7. "eligibility_raw" should capture complete requirements or criteria paragraph verbatim.
8. Output ONLY the raw JSON object. No prose, no markdown fences."""




DIFF_SYSTEM_PROMPT = """You are updating an EXISTING placement drive record with new information.
You will be given the drive's current known state and a new message/document
about the same drive. Extract ONLY what is new or changed — do not repeat
fields that are already correctly recorded.

Reference date: {reference_date}  (ISO 8601, Asia/Kolkata timezone)

Existing drive state:
{existing_drive_summary}

New content:
{new_raw_text}

Rules:
1. If the new content adds a date not already recorded (e.g. an interview
   date announced after the deadline), add it to `new_dates` using the
   same date_type/label/date_iso/date_raw structure as initial extraction.
2. If the new content changes a previously recorded date (e.g. "deadline
   extended to the 20th"), add it as a new entry — do not silently
   overwrite; the confirmation UI will show it as a proposed change
   against the existing value.
3. If the new content changes eligibility, min_cgpa, or the application
   link, include only the changed field(s) in `field_changes`.
4. Write a one-line, human-readable `summary_of_changes` describing what
   this update adds (e.g. "Interview date announced: Oct 12; CGPA cutoff
   revised to 7.5").
5. If the new content contains nothing new relevant to this drive, return
   an empty `new_dates` list, empty `field_changes`, and
   summary_of_changes = "No new information detected."
6. Output ONLY the JSON object matching the schema. No prose."""
