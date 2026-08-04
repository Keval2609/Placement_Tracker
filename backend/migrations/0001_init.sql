-- 0001_init.sql
-- Placement Tracker initial schema + Row-Level Security.
--
-- This migration targets Supabase (it references auth.users and auth.uid()).
-- The compatibility shim below lets the same file also apply cleanly against a
-- plain local Postgres (e.g. postgres:16 in docker-compose) for development.
-- On a real Supabase instance the shim is a no-op because those objects
-- already exist.

-- ---------------------------------------------------------------------------
-- Compatibility shim (safe on real Supabase; sets up minimal auth on local pg)
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- provides gen_random_uuid()

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

-- Provide auth.uid() only if it does not already exist (Supabase defines it).
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(
        current_setting('request.jwt.claim.sub', true),
        ''
    )::uuid
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL UNIQUE,
    company_type  TEXT CHECK(company_type IN ('product','startup','service','psu','unknown')) DEFAULT 'unknown',
    website       TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drives (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES auth.users(id),   -- RLS anchor
    company_id            UUID NOT NULL REFERENCES companies(id),
    role_title             TEXT NOT NULL,
    eligibility_raw         TEXT,
    min_cgpa               REAL,
    eligible_branches       TEXT[],                                  -- native Postgres array
    status                 TEXT CHECK(status IN ('draft','confirmed')) DEFAULT 'draft',
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_dates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id               UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    date_type              TEXT CHECK(date_type IN ('application_deadline','oa','interview','ppt','result','joining','other')) NOT NULL,
    label                 TEXT,
    date_iso               TIMESTAMPTZ NOT NULL,
    date_raw                TEXT,                                    -- original phrase, always preserved
    source                TEXT CHECK(source IN ('ai_suggested','user_added')) NOT NULL,
    confirmed_by_user        BOOLEAN NOT NULL DEFAULT false,
    is_primary_deadline       BOOLEAN NOT NULL DEFAULT false,          -- the one used for sorting/alerts
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_updates (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id               UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    source_type             TEXT CHECK(source_type IN ('whatsapp_text','pdf','docx')),
    raw_text                TEXT,
    summary_of_changes        TEXT,                                   -- human-readable diff, e.g. "Added interview date, revised deadline"
    created_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_documents (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id               UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    drive_update_id           UUID REFERENCES drive_updates(id),        -- null if attached at initial capture
    storage_path             TEXT NOT NULL,                            -- Supabase Storage key
    original_filename         TEXT,
    uploaded_at              TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE applications (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id          UUID NOT NULL UNIQUE REFERENCES drives(id) ON DELETE CASCADE,
    status            TEXT CHECK(status IN ('not_applied','applied','oa','interview','offer','rejected','withdrawn')) DEFAULT 'not_applied',
    applied_at         TIMESTAMPTZ,
    notes             TEXT,
    updated_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ingestion_log (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id                  UUID REFERENCES drives(id),               -- null if extraction failed before a drive existed
    source_type               TEXT,
    status                   TEXT CHECK(status IN ('success','partial','failed')),
    error_message             TEXT,
    created_at               TIMESTAMPTZ DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Row-Level Security
-- ---------------------------------------------------------------------------
-- Anchor: `drives.user_id`. Child tables scope through their drive_id ->
-- drives.user_id join. `companies` is a shared reference table (no user_id),
-- so it is readable by any authenticated user; writes are performed
-- server-side via the service role. Tighten later if needed.

ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE drives          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_dates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_updates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_log   ENABLE ROW LEVEL SECURITY;

-- drives: users can only touch their own rows.
CREATE POLICY "own_drives" ON drives
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- companies: shared reference data, readable by authenticated users.
CREATE POLICY "read_companies" ON companies
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- drive_dates: scope through parent drive.
CREATE POLICY "own_drive_dates" ON drive_dates
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = drive_dates.drive_id AND d.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = drive_dates.drive_id AND d.user_id = auth.uid()
    ));

-- drive_updates: scope through parent drive.
CREATE POLICY "own_drive_updates" ON drive_updates
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = drive_updates.drive_id AND d.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = drive_updates.drive_id AND d.user_id = auth.uid()
    ));

-- drive_documents: scope through parent drive.
CREATE POLICY "own_drive_documents" ON drive_documents
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = drive_documents.drive_id AND d.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = drive_documents.drive_id AND d.user_id = auth.uid()
    ));

-- applications: scope through parent drive.
CREATE POLICY "own_applications" ON applications
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = applications.drive_id AND d.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = applications.drive_id AND d.user_id = auth.uid()
    ));

-- ingestion_log: scope through parent drive. drive_id may be NULL when an
-- extraction failed before a drive existed; such orphan rows are only
-- accessible server-side via the service role.
CREATE POLICY "own_ingestion_log" ON ingestion_log
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = ingestion_log.drive_id AND d.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM drives d
        WHERE d.id = ingestion_log.drive_id AND d.user_id = auth.uid()
    ));
