-- ============================================
-- Production Readiness Core
-- PWA/PDPA support, billing identifiers, and hot-path indexes.
-- ============================================

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_email TEXT,
  ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_customer_unique
  ON organizations(stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS organizations_stripe_subscription_unique
  ON organizations(stripe_subscription_id)
  WHERE stripe_subscription_id IS NOT NULL;

-- dashboard and availability hot paths
CREATE INDEX IF NOT EXISTS reservations_hotel_status_dates_idx
  ON reservations(hotel_id, status, check_in, check_out);
CREATE INDEX IF NOT EXISTS reservations_hotel_created_idx
  ON reservations(hotel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS folios_hotel_status_idx
  ON folios(hotel_id, status);
CREATE INDEX IF NOT EXISTS payments_hotel_status_paid_idx
  ON payments(hotel_id, status, paid_at DESC);
CREATE INDEX IF NOT EXISTS conversations_hotel_unread_idx
  ON conversations(hotel_id, status, unread_count, last_message_at DESC);
CREATE INDEX IF NOT EXISTS messages_conversation_created_asc_idx
  ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS housekeeping_tasks_hotel_status_idx
  ON housekeeping_tasks(hotel_id, status, priority, due_date);
CREATE INDEX IF NOT EXISTS maintenance_requests_hotel_status_idx
  ON maintenance_requests(hotel_id, status, priority, created_at DESC);

-- lightweight privacy request ledger for PDPA operational follow-up
CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_account_id UUID REFERENCES guest_accounts(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('export', 'delete', 'rectify')),
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  fulfilled_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE privacy_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guest_own_privacy_requests" ON privacy_requests FOR SELECT
  USING (guest_account_id = auth.uid());

CREATE INDEX IF NOT EXISTS privacy_requests_guest_idx
  ON privacy_requests(guest_account_id, created_at DESC);
