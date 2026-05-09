# Round 2 — SaaS Control + Integrations

## Added

- Trial auto-expire cron: `/api/cron/trial-expire`
- OTA sync cron: `/api/ota/process`
- OTA duplicate reservation event ledger
- Admin usage metrics endpoint: `/api/admin/orgs/[id]/usage`
- Admin error dashboard endpoint: `/api/admin/errors`
- Admin impersonation session endpoint: `/api/admin/orgs/[id]/impersonate`
- LINE connect wizard API: `/api/channels/line/connect`
- TM30 CSV export fallback: `/api/compliance/tm30/export`
- Webhook HMAC helpers and freshness helper

## Required env

- `CRON_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` for production rate limit
- Provider webhook secrets/tokens for Stripe, Omise, Booking.com, Agoda, LINE, WhatsApp

## Notes

OTA direct provider parsers are still adapter-dependent. The queue now prevents duplicate reservation ingestion and logs retry/failure status, because naturally OTAs enjoy sending the same event twice just to see if your database cries.
