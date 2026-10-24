ALTER TABLE drives ADD COLUMN IF NOT EXISTS job_description TEXT;

UPDATE drives
SET job_description = eligibility_raw
WHERE job_description IS NULL AND eligibility_raw IS NOT NULL;
