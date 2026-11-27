"""Integration tests for PostgreSQL migrations, constraints, and atomic RPCs.

Executed in CI against a real postgres:16 service when DATABASE_URL is set.
"""

import json
import os
import pathlib
import uuid
from concurrent.futures import ThreadPoolExecutor
from threading import Barrier

import pytest

DATABASE_URL = os.environ.get("DATABASE_URL")
pytestmark = pytest.mark.skipif(
    not DATABASE_URL,
    reason="DATABASE_URL not set; skipping Postgres migration & RPC tests.",
)

MIGRATIONS_DIR = pathlib.Path(__file__).resolve().parent.parent / "migrations"


@pytest.fixture(scope="module")
def pg_conn():
    import psycopg

    with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
        with conn.cursor() as cur:
            cur.execute("DROP SCHEMA IF EXISTS public, auth CASCADE; CREATE SCHEMA public;")
            for role in ("anon", "authenticated", "service_role"):
                cur.execute(
                    f"DO $$ BEGIN CREATE ROLE {role}; "
                    "EXCEPTION WHEN duplicate_object THEN NULL; END $$;"
                )
            cur.execute(
                """
                CREATE SCHEMA IF NOT EXISTS auth;
                CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
                  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'authenticated');
                $$;
                """
            )
            for sql_file in sorted(MIGRATIONS_DIR.glob("*.sql")):
                cur.execute(sql_file.read_text(encoding="utf-8"))
        yield conn


def _create_company(conn, name: str = "Acme Corp") -> str:
    cid = str(uuid.uuid4())
    with conn.cursor() as cur:
        cur.execute(
            "INSERT INTO companies (id, name, company_type) "
            "VALUES (%s, %s, 'product') ON CONFLICT (name_key) DO NOTHING",
            (cid, name),
        )
        cur.execute("SELECT id FROM companies WHERE name_key = lower(btrim(%s))", (name,))
        return str(cur.fetchone()[0])


def test_concurrent_drive_dedup(pg_conn):
    """Separate concurrent transactions must create exactly one matching drive."""
    import psycopg

    company_id = _create_company(pg_conn, "Concurrent Dedup Corp")
    start = Barrier(2)

    def create():
        drive_id = str(uuid.uuid4())
        drive = {"id": drive_id, "user_id": "dedup_user", "company_id": company_id,
                 "role_title": " Engineer "}
        dates = [{"id": str(uuid.uuid4()), "drive_id": drive_id,
                  "date_type": "application_deadline", "source": "user_added",
                  "date_iso": "2026-12-01T12:00:00+05:30",
                  "confirmed_by_user": True, "is_primary_deadline": True}]
        application = {"id": str(uuid.uuid4()), "drive_id": drive_id}
        with psycopg.connect(DATABASE_URL, autocommit=True) as conn:
            conn.execute("SET statement_timeout = '10s'")
            start.wait(timeout=10)
            try:
                conn.execute("SELECT create_drive_atomic(%s::jsonb,%s::jsonb,%s::jsonb,NULL)",
                             (json.dumps(drive), json.dumps(dates), json.dumps(application)))
                return "created", drive_id
            except psycopg.Error as exc:
                assert exc.sqlstate == "P4090"
                return "duplicate", exc.diag.message_detail

    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: create(), range(2)))
    assert sorted(r[0] for r in results) == ["created", "duplicate"]
    assert results[0][1] == results[1][1]
    with pg_conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM drives WHERE company_id = %s", (company_id,))
        assert cur.fetchone()[0] == 1


def test_create_drive_atomic_rollback_on_bad_date(pg_conn) -> None:
    """If drive_dates insert fails, the parent drives row must also roll back."""
    import psycopg

    cid = _create_company(pg_conn, "Rollback Corp")
    drive_id = str(uuid.uuid4())
    app_id = str(uuid.uuid4())

    drive_payload = {
        "id": drive_id,
        "user_id": "user_pg_1",
        "company_id": cid,
        "role_title": "SWE",
        "status": "confirmed",
    }
    bad_dates = [
        {
            "id": str(uuid.uuid4()),
            "drive_id": drive_id,
            "date_type": "INVALID_TYPE",
            "date_iso": "2026-12-01T10:00:00+05:30",
            "source": "user_added",
            "confirmed_by_user": True,
            "is_primary_deadline": True,
        }
    ]
    app_payload = {
        "id": app_id,
        "drive_id": drive_id,
        "status": "not_applied",
    }

    with pytest.raises(psycopg.Error):
        with pg_conn.cursor() as cur:
            cur.execute(
                "SELECT create_drive_atomic(%s::jsonb, %s::jsonb, %s::jsonb, NULL)",
                (json.dumps(drive_payload), json.dumps(bad_dates), json.dumps(app_payload)),
            )

    with pg_conn.cursor() as cur:
        cur.execute("SELECT count(*) FROM drives WHERE id = %s", (drive_id,))
        assert cur.fetchone()[0] == 0


def test_single_primary_deadline_index(pg_conn) -> None:
    """drive_dates_one_primary unique partial index rejects two primary deadlines for one drive."""
    import psycopg

    cid = _create_company(pg_conn, "Primary Index Corp")
    drive_id = str(uuid.uuid4())
    with pg_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO drives (id, user_id, company_id, role_title, status) "
            "VALUES (%s, 'user_pg_1', %s, 'SDE', 'confirmed')",
            (drive_id, cid),
        )
        cur.execute(
            """
            INSERT INTO drive_dates
                (id, drive_id, date_type, date_iso, source, confirmed_by_user, is_primary_deadline)
            VALUES
                (%s, %s, 'application_deadline', '2026-12-01T10:00:00+05:30',
                 'user_added', true, true)
            """,
            (str(uuid.uuid4()), drive_id),
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            cur.execute(
                """
                INSERT INTO drive_dates
                    (id, drive_id, date_type, date_iso, source,
                     confirmed_by_user, is_primary_deadline)
                VALUES
                    (%s, %s, 'application_deadline', '2026-12-05T10:00:00+05:30',
                     'user_added', true, true)
                """,
                (str(uuid.uuid4()), drive_id),
            )


def test_alert_log_uniqueness_across_deadline_change(pg_conn) -> None:
    """alert_log allows re-firing when deadline_iso changes, but dedups same deadline."""
    import psycopg

    cid = _create_company(pg_conn, "Alert Log Corp")
    drive_id = str(uuid.uuid4())
    with pg_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO drives (id, user_id, company_id, role_title, status) "
            "VALUES (%s, 'user_pg_1', %s, 'SDE', 'confirmed')",
            (drive_id, cid),
        )
        cur.execute(
            """
            INSERT INTO alert_log (drive_id, user_id, threshold, deadline_iso)
            VALUES (%s, 'user_pg_1', '24h', '2026-12-01T10:00:00+05:30')
            """,
            (drive_id,),
        )
        with pytest.raises(psycopg.errors.UniqueViolation):
            cur.execute(
                """
                INSERT INTO alert_log (drive_id, user_id, threshold, deadline_iso)
                VALUES (%s, 'user_pg_1', '24h', '2026-12-01T10:00:00+05:30')
                """,
                (drive_id,),
            )
        cur.execute(
            """
            INSERT INTO alert_log (drive_id, user_id, threshold, deadline_iso)
            VALUES (%s, 'user_pg_1', '24h', '2026-12-10T10:00:00+05:30')
            """,
            (drive_id,),
        )


def test_confirm_drive_update_atomic_ownership_check(pg_conn) -> None:
    """confirm_drive_update_atomic raises P0002 when p_user_id does not own p_drive_id."""
    import psycopg

    cid = _create_company(pg_conn, "Ownership Corp")
    drive_id = str(uuid.uuid4())
    with pg_conn.cursor() as cur:
        cur.execute(
            "INSERT INTO drives (id, user_id, company_id, role_title, status) "
            "VALUES (%s, 'owner_user', %s, 'SDE', 'confirmed')",
            (drive_id, cid),
        )
        update_payload = {
            "id": str(uuid.uuid4()),
            "source_type": "whatsapp_text",
            "raw_text": "Extended",
            "summary_of_changes": "Extended deadline",
        }
        with pytest.raises(psycopg.Error):
            cur.execute(
                "SELECT confirm_drive_update_atomic("
                "%s::uuid, 'attacker_user', %s::jsonb, '[]'::jsonb, '{}'::jsonb, NULL, false)",
                (drive_id, json.dumps(update_payload)),
            )
