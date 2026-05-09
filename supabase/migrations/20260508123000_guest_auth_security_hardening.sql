-- Guest/auth production hardening support
-- Adds soft-delete metadata used by the PDPA account deletion endpoint.

ALTER TABLE guest_accounts
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_audit_logs_guest_auth_email
  ON audit_logs ((changes->>'email'), action, created_at DESC)
  WHERE entity_type = 'guest_auth';

CREATE INDEX IF NOT EXISTS idx_guest_accounts_deleted_at
  ON guest_accounts(deleted_at)
  WHERE deleted_at IS NOT NULL;
