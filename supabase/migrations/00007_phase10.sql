-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 00007: Phase 10 — Market Dominance
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Promo codes for IBE v2
CREATE TABLE IF NOT EXISTS promo_codes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id      UUID REFERENCES hotels(id) ON DELETE CASCADE,
  code          TEXT NOT NULL,
  description   TEXT,
  discount_type TEXT NOT NULL DEFAULT 'percent', -- percent | fixed | free_night
  discount_value DECIMAL NOT NULL,               -- % หรือ THB หรือ จำนวนคืนฟรี
  min_nights    INT DEFAULT 1,
  min_amount    DECIMAL DEFAULT 0,
  valid_from    DATE,
  valid_until   DATE,
  max_uses      INT,                             -- NULL = unlimited
  used_count    INT DEFAULT 0,
  applies_to    TEXT DEFAULT 'all',              -- all | specific_room_types
  room_type_ids UUID[],
  active        BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, code)
);

-- 2. Group bookings
CREATE TABLE IF NOT EXISTS group_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE CASCADE,
  group_name      TEXT NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT,
  contact_phone   TEXT,
  check_in        DATE NOT NULL,
  check_out       DATE NOT NULL,
  rooms_required  INT NOT NULL DEFAULT 1,
  total_guests    INT DEFAULT 1,
  status          TEXT DEFAULT 'inquiry', -- inquiry | confirmed | cancelled
  discount_pct    DECIMAL DEFAULT 0,
  notes           TEXT,
  reservation_ids UUID[],
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Mobile keys (NFC/BLE)
CREATE TABLE IF NOT EXISTS mobile_keys (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE CASCADE,
  reservation_id  UUID REFERENCES reservations(id) ON DELETE CASCADE,
  room_id         UUID REFERENCES rooms(id) ON DELETE CASCADE,
  guest_account_id UUID REFERENCES guest_accounts(id) ON DELETE CASCADE,
  key_token       TEXT NOT NULL UNIQUE,
  valid_from      TIMESTAMPTZ NOT NULL,
  valid_until     TIMESTAMPTZ NOT NULL,
  revoked         BOOLEAN DEFAULT false,
  last_used_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 4. IoT devices
CREATE TABLE IF NOT EXISTS iot_devices (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  room_id     UUID REFERENCES rooms(id) ON DELETE SET NULL,
  device_type TEXT NOT NULL, -- ac | light | lock | sensor | thermostat
  device_id   TEXT NOT NULL, -- external device identifier
  name        TEXT,
  status      TEXT DEFAULT 'online', -- online | offline | error
  last_seen   TIMESTAMPTZ,
  config      JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, device_id)
);

CREATE TABLE IF NOT EXISTS iot_readings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id   UUID REFERENCES iot_devices(id) ON DELETE CASCADE,
  metric      TEXT NOT NULL, -- temperature | humidity | power_kwh | motion | door_status
  value       DECIMAL,
  unit        TEXT,
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Multi-property loyalty (cross-hotel points)
CREATE TABLE IF NOT EXISTS loyalty_programs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE,
  program_name    TEXT NOT NULL DEFAULT 'Loyalty Program',
  points_per_thb  DECIMAL DEFAULT 1,   -- 1 point per 1 THB spent
  thb_per_point   DECIMAL DEFAULT 0.5, -- 0.5 THB value per point when redeeming
  tiers           JSONB DEFAULT '[
    {"name":"Bronze","min_points":0,"benefits":["ยินดีต้อนรับ"]},
    {"name":"Silver","min_points":5000,"benefits":["ส่วนลด 5%","Late checkout"]},
    {"name":"Gold","min_points":15000,"benefits":["ส่วนลด 10%","Room upgrade","Early checkin"]},
    {"name":"Platinum","min_points":50000,"benefits":["ส่วนลด 15%","Suite upgrade","Personal concierge"]}
  ]',
  active          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cross-hotel guest profile
CREATE TABLE IF NOT EXISTS loyalty_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  guest_account_id UUID REFERENCES guest_accounts(id) ON DELETE CASCADE,
  member_number   TEXT UNIQUE,
  total_points    INT DEFAULT 0,
  lifetime_points INT DEFAULT 0,
  tier            TEXT DEFAULT 'Bronze',
  total_stays     INT DEFAULT 0,
  total_spent     DECIMAL DEFAULT 0,
  joined_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(organization_id, guest_account_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id        UUID REFERENCES loyalty_members(id) ON DELETE CASCADE,
  hotel_id         UUID REFERENCES hotels(id) ON DELETE SET NULL,
  reservation_id   UUID REFERENCES reservations(id) ON DELETE SET NULL,
  type             TEXT NOT NULL, -- earn | redeem | expire | bonus | adjust
  points           INT NOT NULL,
  description      TEXT,
  balance_after    INT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 6. GDS/Metasearch tracking
CREATE TABLE IF NOT EXISTS distribution_channels (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id    UUID REFERENCES hotels(id) ON DELETE CASCADE,
  channel     TEXT NOT NULL, -- google_hotel_ads | tripadvisor | trivago | sabre | amadeus
  status      TEXT DEFAULT 'pending', -- pending | active | paused | error
  config      JSONB DEFAULT '{}',
  last_sync   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hotel_id, channel)
);

-- 7. Revenue targets
CREATE TABLE IF NOT EXISTS revenue_targets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id   UUID REFERENCES hotels(id) ON DELETE CASCADE,
  year       INT NOT NULL,
  month      INT NOT NULL,
  target_revenue  DECIMAL DEFAULT 0,
  target_occupancy DECIMAL DEFAULT 0,
  target_adr      DECIMAL DEFAULT 0,
  actual_revenue  DECIMAL DEFAULT 0,
  actual_occupancy DECIMAL DEFAULT 0,
  actual_adr      DECIMAL DEFAULT 0,
  UNIQUE(hotel_id, year, month)
);

-- RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE mobile_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE iot_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribution_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_targets ENABLE ROW LEVEL SECURITY;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_promo_codes_hotel_code ON promo_codes(hotel_id, code);
CREATE INDEX IF NOT EXISTS idx_mobile_keys_token ON mobile_keys(key_token);
CREATE INDEX IF NOT EXISTS idx_mobile_keys_res ON mobile_keys(reservation_id);
CREATE INDEX IF NOT EXISTS idx_iot_readings_device_time ON iot_readings(device_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_loyalty_members_org_guest ON loyalty_members(organization_id, guest_account_id);
CREATE INDEX IF NOT EXISTS idx_loyalty_tx_member ON loyalty_transactions(member_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_targets_hotel ON revenue_targets(hotel_id, year, month);
