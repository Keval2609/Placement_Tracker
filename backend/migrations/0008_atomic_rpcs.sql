-- Migration: 0008_atomic_rpcs.sql
-- Atomic multi-table RPCs for drive creation and confirmed update merge, locked down to service_role.

CREATE OR REPLACE FUNCTION create_drive_atomic(
    p_drive jsonb,
    p_dates jsonb,
    p_application jsonb,
    p_document jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    INSERT INTO drives (
        id,
        user_id,
        company_id,
        role_title,
        eligibility_raw,
        job_description,
        min_cgpa,
        eligible_branches,
        application_link,
        ctc_display,
        location,
        status,
        created_at
    )
    VALUES (
        (p_drive->>'id')::uuid,
        p_drive->>'user_id',
        (p_drive->>'company_id')::uuid,
        p_drive->>'role_title',
        p_drive->>'eligibility_raw',
        p_drive->>'job_description',
        (p_drive->>'min_cgpa')::real,
        CASE
            WHEN p_drive->'eligible_branches' IS NULL OR jsonb_typeof(p_drive->'eligible_branches') <> 'array'
                THEN ARRAY[]::text[]
            ELSE ARRAY(SELECT jsonb_array_elements_text(p_drive->'eligible_branches'))
        END,
        p_drive->>'application_link',
        p_drive->>'ctc_display',
        p_drive->>'location',
        COALESCE(p_drive->>'status', 'confirmed'),
        COALESCE((p_drive->>'created_at')::timestamptz, now())
    );

    IF p_dates IS NOT NULL AND jsonb_typeof(p_dates) = 'array' AND jsonb_array_length(p_dates) > 0 THEN
        INSERT INTO drive_dates (
            id,
            drive_id,
            date_type,
            label,
            date_iso,
            date_raw,
            source,
            confirmed_by_user,
            is_primary_deadline,
            created_at
        )
        SELECT
            (d->>'id')::uuid,
            (d->>'drive_id')::uuid,
            d->>'date_type',
            d->>'label',
            (d->>'date_iso')::timestamptz,
            d->>'date_raw',
            d->>'source',
            COALESCE((d->>'confirmed_by_user')::boolean, false),
            COALESCE((d->>'is_primary_deadline')::boolean, false),
            COALESCE((d->>'created_at')::timestamptz, now())
        FROM jsonb_array_elements(p_dates) AS d;
    END IF;

    INSERT INTO applications (
        id,
        drive_id,
        status,
        applied_at,
        notes,
        updated_at
    )
    VALUES (
        (p_application->>'id')::uuid,
        (p_application->>'drive_id')::uuid,
        COALESCE(p_application->>'status', 'not_applied'),
        (p_application->>'applied_at')::timestamptz,
        p_application->>'notes',
        COALESCE((p_application->>'updated_at')::timestamptz, now())
    );

    IF p_document IS NOT NULL AND jsonb_typeof(p_document) = 'object' THEN
        INSERT INTO drive_documents (
            id,
            drive_id,
            drive_update_id,
            storage_path,
            original_filename,
            uploaded_at
        )
        VALUES (
            (p_document->>'id')::uuid,
            (p_document->>'drive_id')::uuid,
            (p_document->>'drive_update_id')::uuid,
            p_document->>'storage_path',
            p_document->>'original_filename',
            COALESCE((p_document->>'uploaded_at')::timestamptz, now())
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION create_drive_atomic(jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_drive_atomic(jsonb, jsonb, jsonb, jsonb) TO service_role;


CREATE OR REPLACE FUNCTION confirm_drive_update_atomic(
    p_drive_id uuid,
    p_user_id text,
    p_update jsonb,
    p_new_dates jsonb,
    p_field_updates jsonb,
    p_document jsonb DEFAULT NULL,
    p_promote_primary boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM drives WHERE id = p_drive_id AND user_id = p_user_id
    ) THEN
        RAISE EXCEPTION 'Drive not found or access denied' USING ERRCODE = 'P0002';
    END IF;

    INSERT INTO drive_updates (
        id,
        drive_id,
        source_type,
        raw_text,
        summary_of_changes,
        created_at
    )
    VALUES (
        (p_update->>'id')::uuid,
        p_drive_id,
        p_update->>'source_type',
        p_update->>'raw_text',
        p_update->>'summary_of_changes',
        COALESCE((p_update->>'created_at')::timestamptz, now())
    );

    IF p_promote_primary THEN
        UPDATE drive_dates
        SET is_primary_deadline = false
        WHERE drive_id = p_drive_id AND is_primary_deadline = true;
    END IF;

    IF p_new_dates IS NOT NULL AND jsonb_typeof(p_new_dates) = 'array' AND jsonb_array_length(p_new_dates) > 0 THEN
        INSERT INTO drive_dates (
            id,
            drive_id,
            date_type,
            label,
            date_iso,
            date_raw,
            source,
            confirmed_by_user,
            is_primary_deadline,
            created_at
        )
        SELECT
            (d->>'id')::uuid,
            p_drive_id,
            d->>'date_type',
            d->>'label',
            (d->>'date_iso')::timestamptz,
            d->>'date_raw',
            d->>'source',
            COALESCE((d->>'confirmed_by_user')::boolean, true),
            COALESCE((d->>'is_primary_deadline')::boolean, false),
            COALESCE((d->>'created_at')::timestamptz, now())
        FROM jsonb_array_elements(p_new_dates) AS d;
    END IF;

    IF p_field_updates IS NOT NULL AND jsonb_typeof(p_field_updates) = 'object' AND p_field_updates <> '{}'::jsonb THEN
        UPDATE drives
        SET
            role_title = CASE WHEN p_field_updates ? 'role_title' THEN p_field_updates->>'role_title' ELSE role_title END,
            eligibility_raw = CASE WHEN p_field_updates ? 'eligibility_raw' THEN p_field_updates->>'eligibility_raw' ELSE eligibility_raw END,
            job_description = CASE WHEN p_field_updates ? 'job_description' THEN p_field_updates->>'job_description' ELSE job_description END,
            min_cgpa = CASE WHEN p_field_updates ? 'min_cgpa' THEN (p_field_updates->>'min_cgpa')::real ELSE min_cgpa END,
            eligible_branches = CASE
                WHEN p_field_updates ? 'eligible_branches' AND jsonb_typeof(p_field_updates->'eligible_branches') = 'array'
                    THEN ARRAY(SELECT jsonb_array_elements_text(p_field_updates->'eligible_branches'))
                ELSE eligible_branches
            END,
            application_link = CASE WHEN p_field_updates ? 'application_link' THEN p_field_updates->>'application_link' ELSE application_link END,
            ctc_display = CASE WHEN p_field_updates ? 'ctc_display' THEN p_field_updates->>'ctc_display' ELSE ctc_display END,
            location = CASE WHEN p_field_updates ? 'location' THEN p_field_updates->>'location' ELSE location END
        WHERE id = p_drive_id AND user_id = p_user_id;
    END IF;

    IF p_document IS NOT NULL AND jsonb_typeof(p_document) = 'object' THEN
        INSERT INTO drive_documents (
            id,
            drive_id,
            drive_update_id,
            storage_path,
            original_filename,
            uploaded_at
        )
        VALUES (
            (p_document->>'id')::uuid,
            p_drive_id,
            (p_document->>'drive_update_id')::uuid,
            p_document->>'storage_path',
            p_document->>'original_filename',
            COALESCE((p_document->>'uploaded_at')::timestamptz, now())
        );
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION confirm_drive_update_atomic(uuid, text, jsonb, jsonb, jsonb, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION confirm_drive_update_atomic(uuid, text, jsonb, jsonb, jsonb, jsonb, boolean) TO service_role;
