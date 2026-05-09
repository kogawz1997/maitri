-- ============================================
-- Phase 5: Automation, AI Concierge, Localization, OTA-ready foundation
-- ============================================

CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('checkin_minus_1_day', 'checkout_day', 'payment_overdue', 'booking_created', 'post_checkout_review')),
  channel TEXT NOT NULL DEFAULT 'inbox' CHECK (channel IN ('email', 'line', 'whatsapp', 'inbox')),
  template_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  delay_minutes INT NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  rule_id UUID REFERENCES automation_rules(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'skipped', 'failed')),
  dedupe_key TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS automation_runs_dedupe_unique ON automation_runs(dedupe_key);
CREATE INDEX IF NOT EXISTS automation_rules_hotel_enabled_trigger_idx ON automation_rules(hotel_id, enabled, trigger);
CREATE INDEX IF NOT EXISTS automation_runs_hotel_status_created_idx ON automation_runs(hotel_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS ai_concierge_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_concierge_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  input TEXT NOT NULL,
  output TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0,
  needs_human BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_knowledge_hotel_enabled_idx ON ai_concierge_knowledge(hotel_id, enabled, created_at DESC);
CREATE INDEX IF NOT EXISTS ai_logs_hotel_created_idx ON ai_concierge_logs(hotel_id, created_at DESC);

CREATE TABLE IF NOT EXISTS hotel_localization_settings (
  hotel_id UUID PRIMARY KEY REFERENCES hotels(id) ON DELETE CASCADE,
  default_locale TEXT NOT NULL DEFAULT 'th',
  enabled_locales TEXT[] NOT NULL DEFAULT ARRAY['th', 'en'],
  auto_detect_guest_language BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE reservations ADD COLUMN IF NOT EXISTS preferred_language TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS preferred_language TEXT;

CREATE TABLE IF NOT EXISTS ota_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('booking_com', 'agoda', 'expedia', 'airbnb', 'direct')),
  external_property_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'error')),
  sync_rates BOOLEAN NOT NULL DEFAULT true,
  sync_inventory BOOLEAN NOT NULL DEFAULT true,
  sync_reservations BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(hotel_id, provider, external_property_id)
);

CREATE TABLE IF NOT EXISTS ota_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES ota_connections(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'success', 'failed', 'skipped')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ota_connections_hotel_provider_status_idx ON ota_connections(hotel_id, provider, status);
CREATE INDEX IF NOT EXISTS ota_sync_logs_hotel_created_idx ON ota_sync_logs(hotel_id, created_at DESC);

ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_concierge_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_concierge_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE hotel_localization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE ota_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotel_data_isolation" ON automation_rules;
CREATE POLICY "hotel_data_isolation" ON automation_rules FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON automation_runs;
CREATE POLICY "hotel_data_isolation" ON automation_runs FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON ai_concierge_knowledge;
CREATE POLICY "hotel_data_isolation" ON ai_concierge_knowledge FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON ai_concierge_logs;
CREATE POLICY "hotel_data_isolation" ON ai_concierge_logs FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON hotel_localization_settings;
CREATE POLICY "hotel_data_isolation" ON hotel_localization_settings FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON ota_connections;
CREATE POLICY "hotel_data_isolation" ON ota_connections FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));

DROP POLICY IF EXISTS "hotel_data_isolation" ON ota_sync_logs;
CREATE POLICY "hotel_data_isolation" ON ota_sync_logs FOR ALL
  USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()))
  WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));
