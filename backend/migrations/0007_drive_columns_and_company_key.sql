-- Migration: 0007_drive_columns_and_company_key.sql
-- Adds application_link and location to drives, normalized name_key to companies,
-- and enforces at most one primary deadline per drive.

ALTER TABLE drives ADD COLUMN IF NOT EXISTS application_link TEXT;
ALTER TABLE drives ADD COLUMN IF NOT EXISTS location TEXT;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS name_key TEXT GENERATED ALWAYS AS (lower(btrim(name))) STORED;

CREATE UNIQUE INDEX IF NOT EXISTS companies_name_key_uidx ON companies (name_key);

CREATE UNIQUE INDEX IF NOT EXISTS drive_dates_one_primary
    ON drive_dates (drive_id)
    WHERE is_primary_deadline;
