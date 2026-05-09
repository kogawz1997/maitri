-- Phase 3 operational UX/observability ledger.
-- Used by dashboard error boundary and lightweight production operations checks.

CREATE TABLE IF NOT EXISTS operational_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id uuid REFERENCES hotels(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text NOT NULL DEFAULT 'web',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS operational_events_hotel_created_idx
  ON operational_events(hotel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS operational_events_type_severity_idx
  ON operational_events(event_type, severity, created_at DESC);

ALTER TABLE operational_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS operational_events_hotel_members_read ON operational_events;
CREATE POLICY operational_events_hotel_members_read ON operational_events
  FOR SELECT USING (
    hotel_id IN (
      SELECT h.id FROM hotels h
      JOIN user_profiles p ON p.organization_id = h.organization_id
      WHERE p.id = auth.uid() AND p.active IS TRUE
    )
  );

DROP POLICY IF EXISTS operational_events_hotel_members_insert ON operational_events;
CREATE POLICY operational_events_hotel_members_insert ON operational_events
  FOR INSERT WITH CHECK (
    hotel_id IN (
      SELECT h.id FROM hotels h
      JOIN user_profiles p ON p.organization_id = h.organization_id
      WHERE p.id = auth.uid() AND p.active IS TRUE
    )
  );
