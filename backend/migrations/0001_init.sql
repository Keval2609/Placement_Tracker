CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        EXECUTE 'CREATE SCHEMA IF NOT EXISTS auth';
        EXECUTE 'CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY DEFAULT gen_random_uuid())';
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc p 
        JOIN pg_namespace n ON p.pronamespace = n.oid 
        WHERE n.nspname = 'auth' AND p.proname = 'uid'
    ) THEN
        EXECUTE 'CREATE FUNCTION auth.uid() RETURNS UUID LANGUAGE sql STABLE AS ''SELECT NULLIF(current_setting(''''request.jwt.claim.sub'''', true), '''''''')::uuid''';
    END IF;
END $$;

CREATE TABLE companies (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT NOT NULL UNIQUE,
    company_type  TEXT CHECK(company_type IN ('product','startup','service','psu','unknown')) DEFAULT 'unknown',
    website       TEXT,
    created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drives (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES auth.users(id),
    company_id         UUID NOT NULL REFERENCES companies(id),
    role_title         TEXT NOT NULL,
    eligibility_raw    TEXT,
    min_cgpa           REAL,
    eligible_branches  TEXT[],
    status             TEXT CHECK(status IN ('draft','confirmed')) DEFAULT 'draft',
    created_at         TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_dates (
    id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id             UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    date_type            TEXT CHECK(date_type IN ('application_deadline','oa','interview','ppt','result','joining','other')) NOT NULL,
    label                TEXT,
    date_iso             TIMESTAMPTZ NOT NULL,
    date_raw             TEXT,
    source               TEXT CHECK(source IN ('ai_suggested','user_added')) NOT NULL,
    confirmed_by_user    BOOLEAN NOT NULL DEFAULT false,
    is_primary_deadline  BOOLEAN NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_updates (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id            UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    source_type         TEXT CHECK(source_type IN ('whatsapp_text','pdf','docx')),
    raw_text            TEXT,
    summary_of_changes  TEXT,
    created_at          TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE drive_documents (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id           UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    drive_update_id    UUID REFERENCES drive_updates(id),
    storage_path       TEXT NOT NULL,
    original_filename  TEXT,
    uploaded_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE applications (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id    UUID NOT NULL UNIQUE REFERENCES drives(id) ON DELETE CASCADE,
    status      TEXT CHECK(status IN ('not_applied','applied','oa','interview','offer','rejected','withdrawn')) DEFAULT 'not_applied',
    applied_at  TIMESTAMPTZ,
    notes       TEXT,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE ingestion_log (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id       UUID REFERENCES drives(id),
    source_type    TEXT,
    status         TEXT CHECK(status IN ('success','partial','failed')),
    error_message  TEXT,
    created_at     TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE companies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE drives          ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_dates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_updates   ENABLE ROW LEVEL SECURITY;
ALTER TABLE drive_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_log   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_drives" ON drives
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "read_companies" ON companies
    FOR SELECT
    USING (auth.role() = 'authenticated');

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
