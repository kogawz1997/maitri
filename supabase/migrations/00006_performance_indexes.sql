-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00006: Performance indexes for production scale
-- Run: supabase db push
-- ─────────────────────────────────────────────────────────────────────────────

-- Hotel search (used in /api/public/search)
CREATE INDEX IF NOT EXISTS idx_hotels_city         ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_type         ON hotels(type);
CREATE INDEX IF NOT EXISTS idx_hotels_slug         ON hotels(slug);
CREATE INDEX IF NOT EXISTS idx_hotels_country      ON hotels(country);
CREATE INDEX IF NOT EXISTS idx_hotels_org          ON hotels(organization_id);

-- Hot path: availability check (used every booking search)
CREATE INDEX IF NOT EXISTS idx_res_availability
  ON reservations(hotel_id, check_in, check_out, status);

-- Hot path: dashboard reservation list
CREATE INDEX IF NOT EXISTS idx_res_hotel_checkin
  ON reservations(hotel_id, check_in DESC, status);

-- Guest portal
CREATE INDEX IF NOT EXISTS idx_res_guest_account
  ON reservations(guest_account_id);
CREATE INDEX IF NOT EXISTS idx_guest_accounts_email
  ON guest_accounts(email);

-- Reviews (used in hotel public page)
CREATE INDEX IF NOT EXISTS idx_reviews_hotel_rating
  ON booking_reviews(hotel_id, rating);
CREATE INDEX IF NOT EXISTS idx_reviews_verified
  ON booking_reviews(hotel_id, verified_stay, created_at DESC);

-- Inbox / messaging
CREATE INDEX IF NOT EXISTS idx_messages_conversation
  ON messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_hotel
  ON conversations(hotel_id, status, last_message_at DESC);

-- Audit log (dashboard)
CREATE INDEX IF NOT EXISTS idx_audit_hotel_created
  ON audit_logs(hotel_id, created_at DESC);

-- Loyalty
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_guest
  ON loyalty_transactions(guest_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guests_hotel_email
  ON guests(hotel_id, email);

-- Rate calendar
CREATE INDEX IF NOT EXISTS idx_rate_calendar_lookup
  ON rate_calendar(hotel_id, room_type_id, date);

-- F&B
CREATE INDEX IF NOT EXISTS idx_fb_orders_hotel_status
  ON fb_orders(hotel_id, status, created_at DESC);

-- Spa
CREATE INDEX IF NOT EXISTS idx_spa_bookings_hotel_date
  ON spa_bookings(hotel_id, start_time);

-- Maintenance
CREATE INDEX IF NOT EXISTS idx_maintenance_hotel_status
  ON maintenance_requests(hotel_id, status, created_at DESC);

-- Wishlist (guest portal)
CREATE INDEX IF NOT EXISTS idx_wishlists_guest
  ON guest_wishlists(guest_account_id);

-- Full-text search on hotels (for /search)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'hotels' AND column_name = 'search_vector'
  ) THEN
    ALTER TABLE hotels ADD COLUMN search_vector tsvector
      GENERATED ALWAYS AS (
        to_tsvector('simple',
          coalesce(name, '') || ' ' ||
          coalesce(city, '') || ' ' ||
          coalesce(description, '') || ' ' ||
          coalesce(address, '') || ' ' ||
          coalesce(type, '')
        )
      ) STORED;
    CREATE INDEX idx_hotels_search ON hotels USING GIN(search_vector);
  END IF;
END $$;

-- Email log table for post-stay journey deduplication
CREATE TABLE IF NOT EXISTS email_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id       UUID REFERENCES hotels(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES reservations(id) ON DELETE SET NULL,
  guest_id       UUID REFERENCES guests(id) ON DELETE SET NULL,
  type           TEXT NOT NULL, -- 'booking_confirmation', 'cancellation', 'review', 'return', 'winback', etc.
  email          TEXT,
  sent_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_logs_reservation_type ON email_logs(reservation_id, type);
CREATE INDEX IF NOT EXISTS idx_email_logs_hotel ON email_logs(hotel_id, sent_at DESC);
