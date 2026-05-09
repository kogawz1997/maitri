# Round 2 Closed — SaaS Control + Integrations

## Completed

- Trial auto-expire cron + expiring-soon event logging
- Admin tenant impersonation session API with audit log
- Admin usage metrics per organization
- Admin error dashboard API and UI page
- OTA sync cron registration in `vercel.json`
- OTA duplicate reservation handling ledger
- OTA retry/failure processing
- LINE connect wizard API
- TM30 CSV export fallback
- Webhook HMAC/freshness utility helpers
- Database migration for impersonation sessions, subscription events, OTA reservation events, queue/log constraints
- Round 2 smoke test script

## Still intentionally staged

- Direct OTA provider parsers remain adapter/provider-account dependent.
- LINE credential encryption should be replaced by KMS/Vault before enterprise launch.
- Full E2E/browser tests are Round 3.
