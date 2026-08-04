# Placement Drive Tracker

A production-grade monorepo for tracking college placement drives, automated date extraction, interactive human confirmation, and deadline alerts.

- **`/backend`** — FastAPI (Python 3.11+) + Supabase + Groq/Ollama LLM Pipeline
- **`/frontend`** — Vite + React + TypeScript + Tailwind (PWA)

---

## Current Architecture & Features

### 🤖 AI Extraction Pipeline (PRD Section 3.1 & 3.3)
- **Raw Text Ingestion (`POST /ingest/text`)**: Parses unstructured WhatsApp placement messages and extracts job postings with dates typed as `application_deadline`, `oa`, `interview`, `ppt`, `result`, `joining`, `other`. Resolves relative dates anchored in IST (`Asia/Kolkata`).
- **Document Ingestion (`POST /ingest/file`)**: Accepts multipart `.pdf` (via `pdfplumber`) and `.docx` (via `python-docx`) uploads up to 10MB, flattens table structures with `" | "` separators, and extracts structured posting drafts.
- **PII Safety Guard (`PII_SAFE_PROVIDERS`)**: Strictly limits extraction providers to `groq` and `ollama`. Automatically blocks unapproved providers (e.g. Gemini) to protect personal student data.
- **Schema-Constrained Decoding**: Enforces strict JSON schemas using Groq's `response_format` and Ollama's `format` parameter.
- **Retry & Graceful Fallback**: Retries once on provider/validation errors, then degrades to a 200 OK empty draft (`{"postings": []}`) so the frontend can fall back to a manual-entry form instead of crashing with a 500.
- **Ingestion Audit Log**: Every ingestion attempt records source type (`whatsapp_text`, `pdf`, `docx`) and status (`success`, `partial`, `failed`) into the Supabase `ingestion_log` table.

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
