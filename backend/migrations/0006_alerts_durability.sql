-- Migration: 0006_alerts_durability.sql
-- Fixes push_subscriptions.user_id type for Clerk string IDs and adds persistent alert_log + push_test_log tables.

DROP POLICY IF EXISTS "own_push_subscriptions" ON push_subscriptions;
ALTER TABLE push_subscriptions DROP CONSTRAINT IF EXISTS push_subscriptions_user_id_fkey;
ALTER TABLE push_subscriptions ALTER COLUMN user_id TYPE text USING user_id::text;

CREATE POLICY "own_push_subscriptions" ON push_subscriptions
    FOR ALL
    USING (requesting_user_id() = user_id)
    WITH CHECK (requesting_user_id() = user_id);

CREATE TABLE IF NOT EXISTS alert_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    drive_id UUID NOT NULL REFERENCES drives(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    threshold TEXT NOT NULL CHECK (threshold IN ('48h', '24h', '6h')),
    deadline_iso TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'push_sent',
    push_sent_at TIMESTAMPTZ DEFAULT now(),
    ack_received BOOLEAN NOT NULL DEFAULT false,
    ack_at TIMESTAMPTZ,
    UNIQUE (drive_id, threshold, deadline_iso)
);

ALTER TABLE alert_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_alert_log" ON alert_log;
CREATE POLICY "own_alert_log" ON alert_log
    FOR ALL
    USING (requesting_user_id() = user_id)
    WITH CHECK (requesting_user_id() = user_id);

CREATE TABLE IF NOT EXISTS push_test_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('test', 'onboarding')),
    status TEXT NOT NULL DEFAULT 'push_sent',
    push_sent_at TIMESTAMPTZ DEFAULT now(),
    ack_received BOOLEAN NOT NULL DEFAULT false,
    ack_at TIMESTAMPTZ
);

ALTER TABLE push_test_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_push_test_log" ON push_test_log;
CREATE POLICY "own_push_test_log" ON push_test_log
    FOR ALL
    USING (requesting_user_id() = user_id)
    WITH CHECK (requesting_user_id() = user_id);
