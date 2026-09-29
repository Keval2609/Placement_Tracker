-- Update user_id references from UUID to TEXT for Clerk IDs

-- 1. Alter all tables that have user_id pointing to auth.users (Supabase)
-- Example: ALTER TABLE drives ALTER COLUMN user_id TYPE text;
-- In this schema, we just need to change the user_id columns in all tables.
-- You might have tables like "drives", "applications", "drive_updates", "timeline_events", "document_items"
-- You would need to drop the foreign keys first, alter the column type, and optionally restore foreign keys pointing to a new Clerk users table if one exists.
-- But since Clerk acts as the source of truth, typically you just remove the foreign key to auth.users.

DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP
        -- For each table, if it has a user_id column, try to change it to text
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN user_id TYPE text;', r.tablename);
        EXCEPTION
            WHEN undefined_column THEN
                -- Ignore tables without user_id
            WHEN feature_not_supported THEN
                -- Ignore views or other issues
            WHEN others THEN
                -- Log other errors but continue
                RAISE NOTICE 'Skipping %: %', r.tablename, SQLERRM;
        END;
    END LOOP;
END;
$$;

-- 2. Create function to read Clerk ID from Supabase JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claims', true)::json->>'sub', '')::text;
$$;

-- 3. You should update your RLS policies to use requesting_user_id() instead of auth.uid()
-- E.g. CREATE POLICY "Users can only see their own rows" ON drives FOR SELECT USING (requesting_user_id() = user_id);
