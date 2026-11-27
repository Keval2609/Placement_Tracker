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
AS $body$
DECLARE
    existing_id uuid;
    deadline_date date;
BEGIN
    PERFORM 1 FROM companies WHERE id = (p_drive->>'company_id')::uuid FOR UPDATE;
    SELECT ((d->>'date_iso')::timestamptz AT TIME ZONE 'Asia/Kolkata')::date
    INTO deadline_date
    FROM jsonb_array_elements(COALESCE(p_dates, '[]'::jsonb)) d
    WHERE COALESCE((d->>'is_primary_deadline')::boolean, false)
    LIMIT 1;
    IF deadline_date IS NOT NULL THEN
        SELECT dr.id INTO existing_id
        FROM drives dr JOIN drive_dates dd ON dd.drive_id = dr.id
        WHERE dr.user_id = p_drive->>'user_id'
          AND dr.company_id = (p_drive->>'company_id')::uuid
          AND lower(btrim(dr.role_title)) = lower(btrim(p_drive->>'role_title'))
          AND dd.is_primary_deadline
          AND (dd.date_iso AT TIME ZONE 'Asia/Kolkata')::date = deadline_date
        LIMIT 1;
        IF FOUND THEN
            RAISE EXCEPTION USING ERRCODE = 'P4090',
                MESSAGE = 'Duplicate drive', DETAIL = existing_id::text;
        END IF;
    END IF;
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
        work_mode,
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
        p_drive->>'work_mode',
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
$body$;

REVOKE ALL ON FUNCTION create_drive_atomic(jsonb, jsonb, jsonb, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_drive_atomic(jsonb, jsonb, jsonb, jsonb) TO service_role;
