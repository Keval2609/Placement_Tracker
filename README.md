# Placement Drive Tracker

A monorepo for tracking placement drives.

- **`/backend`** — FastAPI (Python 3.12) + Supabase
- **`/frontend`** — Vite + React + TypeScript + Tailwind (PWA)

> Infrastructure scaffold only — no product features yet.

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- Python 3.12 (for running the backend outside Docker)

## Quick start (backend + db)

```bash
docker compose up --build
```

This boots a local Postgres and the FastAPI backend. The migration in
`backend/migrations/` is applied automatically on the database's first boot.

Verify the backend:

```bash
curl localhost:8000/health
# {"status":"ok"}
```

## Frontend

```bash
cd frontend
cp .env.example .env      # fill in your Supabase URL + anon key
npm install
npm run dev
```

## Environment variables

### Backend (`backend/.env`)

| Var | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — **server-side only, never shipped to the frontend** |

### Frontend (`frontend/.env`)

| Var | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key (safe to expose) |

## Database

`backend/migrations/0001_init.sql` contains the schema and Row-Level Security
policies. It targets Supabase (uses `auth.users` and `auth.uid()`), and includes
a small compatibility shim so it also applies cleanly against a plain local
Postgres for development.

## CI

GitHub Actions (`.github/workflows/ci.yml`) runs on push/PR:

- **backend**: `ruff` lint + `pytest`
- **frontend**: `eslint` + `vite build`
