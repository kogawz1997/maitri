-- Phase 12: SaaS control + integrations hardening.

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS suspended_at timestamptz;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS suspension_reason text;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS owner_email text;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION auth.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT COALESCE((SELECT is_platform_admin FROM public.user_profiles WHERE id = auth.uid()), false);
$$;

CREATE TABLE IF NOT EXISTS subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  provider_event_id text,
  event_type text NOT NULL,
  status text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS subscription_events_org_created_idx ON subscription_events(organization_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS subscription_events_provider_event_unique ON subscription_events(provider_event_id) WHERE provider_event_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  admin_user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended', 'expired')),
  expires_at timestamptz NOT NULL,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS admin_impersonation_org_created_idx ON admin_impersonation_sessions(organization_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ota_reservation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  provider text NOT NULL,
  external_reservation_id text NOT NULL,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'duplicate', 'conflict', 'accepted', 'rejected')),
  duplicate_count int NOT NULL DEFAULT 0,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  conflict_reason text,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, provider, external_reservation_id)
);
CREATE INDEX IF NOT EXISTS ota_reservation_events_hotel_created_idx ON ota_reservation_events(hotel_id, created_at DESC);

ALTER TABLE ota_sync_queue DROP CONSTRAINT IF EXISTS ota_sync_queue_status_check;
ALTER TABLE ota_sync_queue ADD CONSTRAINT ota_sync_queue_status_check CHECK (status IN ('pending', 'processing', 'retry', 'done', 'failed', 'skipped'));
ALTER TABLE ota_sync_queue ADD COLUMN IF NOT EXISTS last_error text;
ALTER TABLE ota_sync_logs DROP CONSTRAINT IF EXISTS ota_sync_logs_status_check;
ALTER TABLE ota_sync_logs ADD CONSTRAINT ota_sync_logs_status_check CHECK (status IN ('queued', 'success', 'failed', 'skipped', 'retry', 'duplicate_ignored'));
ALTER TABLE ota_sync_logs ADD COLUMN IF NOT EXISTS errors jsonb;
ALTER TABLE ota_sync_logs ADD COLUMN IF NOT EXISTS duration_ms int;

ALTER TABLE admin_impersonation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_reservation_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS platform_admin_all ON admin_impersonation_sessions;
CREATE POLICY platform_admin_all ON admin_impersonation_sessions FOR ALL USING (auth.is_platform_admin()) WITH CHECK (auth.is_platform_admin());

DROP POLICY IF EXISTS platform_admin_subscription_events ON subscription_events;
CREATE POLICY platform_admin_subscription_events ON subscription_events FOR ALL USING (auth.is_platform_admin()) WITH CHECK (auth.is_platform_admin());

DROP POLICY IF EXISTS hotel_data_isolation ON ota_reservation_events;
CREATE POLICY hotel_data_isolation ON ota_reservation_events FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));
