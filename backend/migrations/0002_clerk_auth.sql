CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;

DROP POLICY IF EXISTS "own_drives" ON drives;
DROP POLICY IF EXISTS "own_drive_dates" ON drive_dates;
DROP POLICY IF EXISTS "own_drive_updates" ON drive_updates;
DROP POLICY IF EXISTS "own_drive_documents" ON drive_documents;
DROP POLICY IF EXISTS "own_applications" ON applications;
DROP POLICY IF EXISTS "own_ingestion_log" ON ingestion_log;
DROP POLICY IF EXISTS "read_companies" ON companies;

ALTER TABLE drives DROP CONSTRAINT IF EXISTS drives_user_id_fkey;
ALTER TABLE drives ALTER COLUMN user_id TYPE text;

CREATE POLICY "read_companies" ON companies
    FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated');

CREATE POLICY "own_drives" ON drives
    FOR ALL
    USING (requesting_user_id() = user_id)
    WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "own_drive_dates" ON drive_dates
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_dates.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_dates.drive_id AND d.user_id = requesting_user_id()));

CREATE POLICY "own_drive_updates" ON drive_updates
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_updates.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_updates.drive_id AND d.user_id = requesting_user_id()));

CREATE POLICY "own_drive_documents" ON drive_documents
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_documents.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_documents.drive_id AND d.user_id = requesting_user_id()));

CREATE POLICY "own_applications" ON applications
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = applications.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = applications.drive_id AND d.user_id = requesting_user_id()));

CREATE POLICY "own_ingestion_log" ON ingestion_log
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = ingestion_log.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = ingestion_log.drive_id AND d.user_id = requesting_user_id()));
