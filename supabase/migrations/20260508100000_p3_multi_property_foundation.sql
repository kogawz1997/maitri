-- P3 Multi-property foundation
CREATE TABLE IF NOT EXISTS guest_identity_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  canonical_guest_id uuid REFERENCES guests(id) ON DELETE SET NULL,
  identity_key text NOT NULL,
  identity_type text NOT NULL CHECK (identity_type IN ('email','phone','passport','external')),
  confidence_score numeric(5,2) NOT NULL DEFAULT 1.0,
  source_hotel_id uuid REFERENCES hotels(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, identity_key, identity_type)
);

CREATE INDEX IF NOT EXISTS guest_identity_org_idx ON guest_identity_map(organization_id, created_at DESC);

ALTER TABLE guest_identity_map ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "guest_identity_org_isolation" ON guest_identity_map;
CREATE POLICY "guest_identity_org_isolation" ON guest_identity_map
FOR ALL USING (organization_id = auth.user_organization_id())
WITH CHECK (organization_id = auth.user_organization_id());

CREATE OR REPLACE VIEW org_central_revenue_daily AS
SELECT
  h.organization_id,
  date_trunc('day', r.created_at)::date AS revenue_date,
  count(*) AS reservations_count,
  coalesce(sum(r.total_amount), 0) AS total_revenue
FROM reservations r
JOIN hotels h ON h.id = r.hotel_id
GROUP BY h.organization_id, date_trunc('day', r.created_at)::date;
