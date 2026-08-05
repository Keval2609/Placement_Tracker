# Placement Drive Tracker

A production-grade monorepo for tracking college placement drives, automated date extraction, interactive human confirmation, and deadline alerts.

- **`/backend`** — FastAPI (Python 3.11+) + Supabase + Groq/Ollama LLM Pipeline
- **`/frontend`** — Vite + React + TypeScript + Tailwind (PWA)

---

## Current Architecture & Features

### 🏠 Main Dashboard & Application Tracking (PRD Section 1.3.5)
- **Home Dashboard (`GET /drives`)**: Displays placement drive cards sorted by nearest `is_primary_deadline` ascending.
- **Closed / Overdue Section**: Overdue and past deadlines automatically sort into a visually distinct "Closed / Past Drives" section at the bottom of the dashboard.
- **Persistent Filters (`localStorage`)**:
  - **Company Type Multi-Select**: Filter by `product`, `startup`, `service`, `psu`, or `unknown`. Selections are persisted in `localStorage` under `pt_filter_company_types` to survive page reloads.
  - **Application Status Multi-Select**: Filter by `not_applied`, `applied`, `oa`, `interview`, `offer`, `rejected`, or `withdrawn`.
  - **Deadline Window Selector**: Filter by `next_7_days`, `next_30_days`, or `all`.
- **Inline Status Updating (`PATCH /applications/{id}`)**:
  - Direct status update dropdown on each card with unrestricted state transitions (allowing users to roll back or undo accidental changes).
  - **Set-Once `applied_at` Timestamp**: Automatically sets `applied_at` when status transitions to `applied` for the first time, leaving `applied_at` untouched on subsequent status changes (e.g. `applied → interview`).
- **Drive Navigation**: Tapping any drive card navigates directly to its detail page (`/drives/{id}`).

### 🤖 AI Extraction Pipeline (PRD Section 3.1 & 3.3)
- **Raw Text Ingestion (`POST /ingest/text`)**: Parses unstructured WhatsApp placement messages and extracts job postings with dates typed as `application_deadline`, `oa`, `interview`, `ppt`, `result`, `joining`, `other`. Resolves relative dates anchored in IST (`Asia/Kolkata`).
- **Document Ingestion (`POST /ingest/file`)**: Accepts multipart `.pdf` (via `pdfplumber`) and `.docx` (via `python-docx`) uploads up to 10MB, flattens table structures with `" | "` separators, and extracts structured posting drafts.
- **PII Safety Guard (`PII_SAFE_PROVIDERS`)**: Strictly limits extraction providers to `groq` and `ollama`. Automatically blocks unapproved providers (e.g. Gemini) to protect personal student data.
- **Schema-Constrained Decoding**: Enforces strict JSON schemas using Groq's `response_format` and Ollama's `format` parameter.
- **Retry & Graceful Fallback**: Retries once on provider/validation errors, then degrades to a 200 OK empty draft (`{"postings": []}`) so the frontend can fall back to a manual-entry form instead of crashing with a 500.
- **Ingestion Audit Log**: Every ingestion attempt records source type (`whatsapp_text`, `pdf`, `docx`) and status (`success`, `partial`, `failed`) into the Supabase `ingestion_log` table.

### 💾 Confirmed Drive Save & Backend Logic (`POST /drives`)
- **Server-Side Deadline Enforcement (HTTP 422)**: Re-validates that at least one `application_deadline` date has `confirmed_by_user=true`. Directly rejects unconfirmed or missing deadline requests server-side even if bypassed by client calls.
- **Deduplication Check (HTTP 409)**: Matches on `(company_id, role_title, primary_deadline_date)`. If an existing drive matches, responds with `409 Conflict` containing `existing_drive_id` so the user can view the existing drive instead of creating duplicates.
- **Company-Type Classification & Tagging**: Automatically tags companies as `product`, `startup`, `service`, `psu`, or `unknown`. Ships with a static lookup list of 35+ well-known Indian companies (e.g. TCS, Infosys, Swiggy, Zomato, Razorpay, Google, ISRO) for fast zero-latency tagging, falling back to LLM classification for unknown company names.
- **Multi-Table Database Persistence**: Writes records atomically across `companies` (if new), `drives`, `drive_dates` (normalizing `is_primary_deadline=true` on exactly one primary deadline), `applications` (default status `not_applied`), and `drive_documents`.
- **Document Attachment Storage**: Uploads attached PDF/DOCX files to Supabase Storage bucket `drive-documents` with `drive_update_id = NULL`.

### 🔄 Post-Save Updates & Timeline (`POST /drives/{id}/updates` & `PATCH /drives/{id}/updates/{update_id}/confirm`)
- **Diff-Oriented Update Extraction (`POST /drives/{id}/updates`)**: Accepts follow-up raw text or uploaded documents (`.pdf`/`.docx`). Automatically generates a compact summary of the drive's existing state on record (`existing_drive_summary`) and runs the LLM Diff Prompt (PRD Section 3.2) to extract only new or changed fields (`UpdateResult` draft) without modifying the database directly.
- **Human Confirmation Gate**: Proposed update diffs (`new_dates` and `field_changes`) are returned as a draft for user confirmation before any database mutations occur.
- **Confirm & Merge Endpoint (`PATCH /drives/{id}/updates/{update_id}/confirm`)**: Merges confirmed update additions by writing a `drive_updates` audit record, appending new `drive_dates` rows, applying confirmed field modifications to `drives`, and uploading follow-up document attachments to Supabase Storage linked to `drive_documents.drive_update_id`.

### 📊 Drive Detail Page, Timeline View & Document Repository (PRD Section 1.3.4)
- **Drive Detail Header (`GET /drives/{id}`)**: Displays company name, company-type badge (`product`, `startup`, `service`, `psu`, `unknown`), role title, eligibility criteria, application link, application status badge, and all confirmed dates (highlighting the primary deadline in red).
- **Chronological History Timeline (`GET /drives/{id}/timeline`)**: Displays a read-only timeline combining the initial creation event ("Initial capture") and every subsequent `drive_updates` row in chronological order, with `source_type` icons (`whatsapp_text`, `pdf`, `docx`) and change summaries.
- **Signed Document Repository (`GET /drives/{id}/documents`)**: Lists all attached circular files across initial capture and follow-up updates, complete with server-generated 5-minute short-expiry signed URLs for secure downloads.
- **Integrated "Add Update" Modal**: Allows users to paste follow-up text or upload circular files directly from the drive detail page, rendering proposed diffs using the `DateRow` confirmation component and updating the header's current dates immediately upon confirmation.

### 🛡️ Draft Confirmation Screen & Trust Gate (PRD 1.3.3 & Risk Mitigation #4)
- **Interactive Draft Cards**: Renders AI extraction results into editable cards for company details, role title, CGPA cutoffs, branches, application links, and dates.
- **Amber vs. Green Date Badges**:
  - Unconfirmed AI suggestions display an amber badge: `"AI suggested — tap to confirm or edit"`.
  - Confirmed dates display a green badge: `"Confirmed"`.
  - Verbatim original date text (`date_raw`) is shown as a caption under each picker for context.
- **Strict Human Confirmation Gate**: The Save button is strictly disabled with a visible explanation until at least one `application_deadline` is confirmed **and** every other AI-suggested date is reviewed/dismissed.
- **No Bulk-Confirm (By Design)**: Zero "Confirm All" or bulk-confirm controls exist anywhere in the application, preventing autopilot rubber-stamping of AI guesses.
- **Manual Date Entry**: Users can add missed dates manually via an embedded form (`+ Add Date Manually`), which marks them as user-confirmed.

---

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Python 3.11+ (for running the backend outside Docker)

---

## Quick Start (Backend + DB)

### 1. Environment Setup

Create `backend/.env` from `backend/.env.example`:

```bash
cd backend
cp .env.example .env
```

Fill in your configuration:
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY` (Get a key from [console.groq.com](https://console.groq.com))

### 2. Local Backend Run

```bash
# Install dependencies
pip install -e .[dev]

# Start API server
uvicorn app.main:app --reload
```

Or via Docker Compose:

```bash
docker compose up --build
```

### 3. Verify Health & Extraction Endpoints

```bash
# Health check
curl http://localhost:8000/health
# {"status":"ok"}

# Test extraction API
curl -X POST http://localhost:8000/ingest/text \
  -H "Content-Type: application/json" \
  -d '{"text": "Google SDE Intern 2026. Min CGPA: 8.0. Apply by 10th Aug: https://careers.google.com/jobs/1"}'
```

---

## Frontend Setup

```bash
cd frontend
cp .env.example .env      # Fill in API Base URL + Supabase keys
npm install
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `SUPABASE_URL` | Supabase project URL | `""` |
| `SUPABASE_ANON_KEY` | Public anon key | `""` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (**server-side only**) | `""` |
| `CORS_ORIGINS` | Allowed frontend origins | `http://localhost:5173` |
| `LLM_PROVIDER` | Active extraction LLM provider (`groq` or `ollama`) | `groq` |
| `GROQ_API_KEY` | Groq API Key | `""` |
| `GROQ_MODEL` | Groq Model ID | `llama-3.3-70b-versatile` |
| `OLLAMA_BASE_URL` | Local Ollama Base URL | `http://localhost:11434` |
| `OLLAMA_MODEL` | Local Ollama Model Name | `qwen2.5:7b` |

### Frontend (`frontend/.env`)

| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_BASE_URL` | FastAPI backend base URL | `http://localhost:8000` |
| `VITE_SUPABASE_URL` | Supabase project URL | `""` |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose) | `""` |

---

## Testing & Quality Assurance

### Backend Tests
Run pytest test suite (includes Pydantic models, PII guard, parsers, and endpoint tests):

```bash
cd backend
pytest
ruff check .
```

### Frontend Build & Lint
Verify TypeScript compilation, PWA generation, and ESLint checks:

```bash
cd frontend
npm run lint
npm run build
```

---

## Database

`backend/migrations/0001_init.sql` contains the Postgres schema (`companies`, `drives`, `drive_dates`, `drive_updates`, `drive_documents`, `applications`, `ingestion_log`) with Row-Level Security (RLS) policies for Supabase and local Postgres development.

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci.yml`) runs on push and pull requests:

- **backend**: `ruff` lint + `pytest`
- **frontend**: `eslint` + `vite build`
