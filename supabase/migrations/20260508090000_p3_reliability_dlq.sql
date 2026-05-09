-- P3 Reliability: dead-letter queue + reliability events
CREATE TABLE IF NOT EXISTS dead_letter_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_table text NOT NULL,
  source_id uuid,
  source_provider text,
  failure_reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  attempts int NOT NULL DEFAULT 0,
  moved_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS dead_letter_queue_source_idx ON dead_letter_queue(source_table, source_provider, moved_at DESC);
CREATE INDEX IF NOT EXISTS dead_letter_queue_unresolved_idx ON dead_letter_queue(moved_at DESC) WHERE resolved_at IS NULL;

ALTER TABLE dead_letter_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "platform_admin_dead_letter_queue" ON dead_letter_queue;
CREATE POLICY "platform_admin_dead_letter_queue" ON dead_letter_queue
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
