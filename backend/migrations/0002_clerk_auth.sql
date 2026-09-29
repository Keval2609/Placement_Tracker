-- 1. Create function to read Clerk ID from Supabase JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;

-- 2. Drop all existing RLS policies FIRST so we can alter the columns they depend on
DROP POLICY IF EXISTS "own_drives" ON drives;
DROP POLICY IF EXISTS "own_drive_dates" ON drive_dates;
DROP POLICY IF EXISTS "own_drive_updates" ON drive_updates;
DROP POLICY IF EXISTS "own_drive_documents" ON drive_documents;
DROP POLICY IF EXISTS "own_applications" ON applications;
DROP POLICY IF EXISTS "own_ingestion_log" ON ingestion_log;
DROP POLICY IF EXISTS "read_companies" ON companies;

-- 3. Drop the foreign key constraint that binds drives to auth.users
-- Since auth.users(id) is a UUID and Clerk uses TEXT (e.g. 'user_2n...'), 
-- we must sever this link. The exact constraint name is typically drives_user_id_fkey.
ALTER TABLE drives DROP CONSTRAINT IF EXISTS drives_user_id_fkey;

-- 4. Change drives.user_id to TEXT now that the policies are dropped
ALTER TABLE drives ALTER COLUMN user_id TYPE text;

-- 5. Recreate policies with requesting_user_id()

-- companies: shared reference data, readable by authenticated users (from Clerk).
CREATE POLICY "read_companies" ON companies
    FOR SELECT
    USING (current_setting('request.jwt.claims', true)::json->>'role' = 'authenticated');

-- drives
CREATE POLICY "own_drives" ON drives
    FOR ALL
    USING (requesting_user_id() = user_id)
    WITH CHECK (requesting_user_id() = user_id);

-- drive_dates
CREATE POLICY "own_drive_dates" ON drive_dates
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_dates.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_dates.drive_id AND d.user_id = requesting_user_id()));

-- drive_updates
CREATE POLICY "own_drive_updates" ON drive_updates
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_updates.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_updates.drive_id AND d.user_id = requesting_user_id()));

-- drive_documents
CREATE POLICY "own_drive_documents" ON drive_documents
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_documents.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = drive_documents.drive_id AND d.user_id = requesting_user_id()));

-- applications
CREATE POLICY "own_applications" ON applications
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = applications.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = applications.drive_id AND d.user_id = requesting_user_id()));

-- ingestion_log
CREATE POLICY "own_ingestion_log" ON ingestion_log
    FOR ALL
    USING (EXISTS (SELECT 1 FROM drives d WHERE d.id = ingestion_log.drive_id AND d.user_id = requesting_user_id()))
    WITH CHECK (EXISTS (SELECT 1 FROM drives d WHERE d.id = ingestion_log.drive_id AND d.user_id = requesting_user_id()));
