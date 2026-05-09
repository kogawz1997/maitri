-- ============================================
-- Phase 8: Growth / Scale / AI / OTA Closure
-- ============================================
CREATE TABLE IF NOT EXISTS ota_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id UUID NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
  connection_id UUID REFERENCES ota_connections(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('push', 'pull')),
  type TEXT NOT NULL DEFAULT 'full' CHECK (type IN ('rates', 'inventory', 'reservations', 'full')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'done', 'failed', 'skipped')),
  attempts INT NOT NULL DEFAULT 0,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  error TEXT,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ota_sync_queue_hotel_status_created_idx ON ota_sync_queue(hotel_id, status, created_at ASC);
CREATE INDEX IF NOT EXISTS ota_sync_queue_pending_idx ON ota_sync_queue(status, created_at ASC) WHERE status IN ('pending', 'processing');
ALTER TABLE ota_sync_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hotel_data_isolation" ON ota_sync_queue;
CREATE POLICY "hotel_data_isolation" ON ota_sync_queue FOR ALL USING (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id())) WITH CHECK (hotel_id IN (SELECT id FROM hotels WHERE organization_id = auth.user_organization_id()));
ALTER TABLE ai_concierge_logs ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE ai_concierge_logs ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS ai_logs_hotel_intent_created_idx ON ai_concierge_logs(hotel_id, intent, created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_hotel_status_dates_idx ON reservations(hotel_id, status, check_in, check_out);
CREATE INDEX IF NOT EXISTS payments_hotel_status_created_amount_idx ON payments(hotel_id, status, created_at DESC, amount);
CREATE INDEX IF NOT EXISTS fb_orders_hotel_status_created_idx ON fb_orders(hotel_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS spa_bookings_hotel_status_created_idx ON spa_bookings(hotel_id, status, created_at DESC);
