# MASTER 4P TASKS — Production Handoff & Closure

Updated: 2026-05-08
Owner handoff: Dev / Ops / Finance / Vendor Integrations
Status: **Code-ready for production build; live go-live still requires real production secrets, vendor dashboards, and production smoke evidence.**

> Note: The uploaded ZIP did not contain a file named `MASTER_4P_TASKS`. This file was recreated as the new source of truth from `TODO.md`, `docs/TODO_3P_MAPPING.md`, and the actual codebase state.

## Executive Summary

The project has been hardened to the strongest practical level available in this sandbox. All items that can be completed in code without vendor dashboards or production secrets have been completed or converted into fail-closed/staged workflows. Items that cannot be completed without live access are documented with exact owners, inputs, commands, evidence, and rollback steps.

### Current Verification Status

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run type-check` | PASS |
| ESLint | `npm run lint` | PASS, 0 errors, 61 warnings |
| Core/unit/static E2E/final checks | `npm run check` | PASS |
| Security audit | `npm run security-check` | PASS, 0 critical, 0 warnings |
| Production build | `NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_WORKERS=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build` | PASS |
| Deployment target matrix | `npm run deploy:check` | PASS |

## 4P Closure Matrix

| 4P Area | Previous Gap | Status Now | What Changed |
| --- | --- | --- | --- |
| P0 Payment & Billing | Webhook/idempotency/reconcile hardening and live provider readiness | DONE in code, VERIFY in live Stripe/Omise | Stripe/Omise webhook idempotency no longer writes non-UUID event IDs into UUID columns; billing/reconcile routes are rate-limited and fail closed when provider secrets are absent. |
| P1 Partner / OTA | Booking.com, Agoda, Airbnb workers and reconciliation were marked as unfinished/stubbed | FIELD_READY | Workers now have cron auth, rate limits, no fake success states, skip with clear errors when vendor credentials/certification are missing, and webhooks route events to real hotel IDs via active OTA/channel connections. |
| P2 Protection / Reservation Safety | Overbooking/race-condition proof needed | DONE locally, VERIFY with real DB load test | Advisory-lock availability guard exists and is covered by unit policy tests. Live concurrent reservation test is prepared as a production/staging evidence task. |
| P3 Protection / Security | Rate limits, brute force, device/IP audit, secure upload validation | DONE | Added guest auth audit/brute-force lock/session/IP anomaly tracking, upload URL/type/path validation, more Zod validation, and security audit now returns 0 warnings. |
| P4 Production Ops | Env, smoke, readiness, sign-off, owners/evidence/rollback | FIELD_READY | Added production handoff steps, env requirements, deployment command sequence, evidence checklist, and rollback runbook below. |

## Completed in This Patch

### Security / Auth

- Added guest-login brute-force protection: 5 failed attempts within 15 minutes lock the email/IP/device combination through audit-log backed checks.
- Added guest auth audit trail for login failure, blocked login, successful login, logout, password reset, and registration.
- Added session/device tracking and IP anomaly logging for guest logins.
- Added rate limiting to auth, payment, guest wishlist/reviews/referrals, AI chat/pricing, rates, promotions, storage, IoT, mobile key, loyalty, OTA, and partner integration routes that were missing explicit request guards.
- Added validation helpers for uploaded/public image URLs and storage object paths.
- Added or tightened Zod request validation across high-impact routes.
- Updated `scripts/security-audit.mjs` so helper-protected worker routes are recognized correctly.

### Payment / Billing

- Fixed Stripe billing webhook idempotency so provider event IDs are checked in JSONB `changes` instead of being compared to a UUID `entity_id`.
- Fixed Stripe invoice/dispute audit writes so non-UUID Stripe IDs are stored in `changes` rather than `entity_id`.
- Fixed Omise webhook idempotency with JSONB event tracking instead of UUID `entity_id` misuse.
- Hardened Omise reconciliation to fail closed when live provider secrets are not configured.
- Added rate limits to payment receipt/reconcile/billing webhook paths.

### OTA / Channel Manager

- Reworked provider workers for Booking.com, Agoda, and Airbnb to stop reporting fake `worker_success` statuses. They now mark jobs as `skipped` with exact missing credential/certification details until a certified provider adapter is connected.
- Fixed provider worker log status values to match DB constraints: `queued`, `success`, `failed`, `skipped`, `retry`, `duplicate_ignored`.
- Added webhook connection resolution so Booking.com/Agoda webhooks do not insert external property IDs into the UUID `hotel_id` column. Webhooks now map external property IDs to active `ota_connections` or legacy `channel_connections` first.
- Fixed legacy channel dashboard writes to use existing `channel_connections` columns: `status`, `external_property_id`, `credentials`, and `config`.
- Added property ID input to the channel setup modal.
- Changed the dashboard sync button from a fake success message to a staged/vendor-readiness message.
- Patched OTA cron normalization to read provider/API credentials from `channel_connections.credentials` and `external_property_id`.
- Added OTA environment placeholders for Booking.com, Agoda, and Airbnb direct/API credentials.

### Reservation Safety

- Verified availability-lock guard policy via `tests/unit/availability-lock-guards.test.mjs`.
- Existing implementation uses Postgres advisory locks, active-reservation overlap checks, `pending_payment` inventory holds, and unlock-in-finally behavior.
- Live concurrent race test remains a staging/production evidence step because it needs a real Supabase database and test hotel/room inventory.

### Uploads / Storage

- Added MIME/type/extension constraints for uploaded hotel assets.
- Restricted room-type image URLs to safe HTTPS/local paths and allowed image extensions.
- Restricted optimization jobs to the intended hotel-assets bucket and safe storage paths.

### IoT / Mobile Key

- IoT route now requires webhook secret in production and fails closed if vendor command credentials are absent.
- Mobile key verification supports a verification secret and fails closed in production when the secret is not configured.
- Added production env placeholders for IoT and mobile-key vendor credentials.

## Items That Cannot Be Fully Completed in the Sandbox

These are not code gaps; they require production access or vendor approval. Each item is ready for execution.

| Item | Why It Cannot Be Completed Here | Owner | Exact Next Action | Evidence to Attach | Rollback |
| --- | --- | --- | --- | --- | --- |
| Supabase production env + migrations | Requires production Supabase project access and service-role secret | Ops/Dev | Set prod env vars, then apply migrations including `20260508123000_guest_auth_security_hardening.sql` | Supabase migration log screenshot + `npm run check:env` output | Restore DB backup or revert latest migration if migration fails before traffic cutover |
| Supabase Email verification | Dashboard-only setting; cannot verify from source code | Ops | Supabase Dashboard → Auth → Providers/Email → confirm email verification settings | Screenshot of Auth email verification settings | Re-enable prior auth policy or disable guest self-registration temporarily |
| SendGrid verified sender/domain | Requires SendGrid account/domain DNS | Ops | Verify `SENDGRID_FROM_EMAIL` or domain authentication | SendGrid verified sender screenshot + test email header | Switch `SENDGRID_FROM_EMAIL` back to last verified sender |
| Upstash Redis prod rate limiting | Requires Upstash project | Ops | Create Redis DB, set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` | Upstash dashboard screenshot + rate-limit test | Remove envs to fall back to in-memory rate limit temporarily |
| Stripe live billing | Requires Stripe live account, products, webhook endpoint | Finance/Ops | Create live products/prices, set live envs, register webhook, run test subscription | Stripe webhook delivery screenshot + billing test log | Disable billing UI or revert Stripe envs to previous live keys |
| Omise live payments | Requires Omise live KYC/account keys | Finance/Ops | Set `OMISE_SECRET_KEY`, `OMISE_PUBLIC_KEY`, `OMISE_WEBHOOK_SECRET`, run small live payment/refund test | Omise dashboard transaction/refund screenshot | Disable Omise method in payment settings |
| Sentry monitoring | Requires Sentry org/project | Ops | Set `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`; trigger test error | Sentry event screenshot | Remove Sentry envs; app continues without Sentry wrapper |
| Booking.com direct integration | Requires Connectivity Partner approval/certification/API keys | Vendor/Ops | Finish Booking.com certification, set `BOOKING_COM_API_KEY`, `BOOKING_COM_PROPERTY_ID`, `BOOKING_COM_WEBHOOK_TOKEN`, attach provider adapter | Booking.com certification + webhook delivery + worker log | Pause Booking.com connection or route through aggregator |
| Agoda direct integration | Requires Agoda YCS API approval/API key | Vendor/Ops | Finish YCS approval, set `AGODA_API_KEY`, `AGODA_PROPERTY_ID`, `AGODA_WEBHOOK_TOKEN`, attach provider adapter | Agoda YCS approval + webhook/worker log | Pause Agoda connection or route through aggregator |
| Airbnb direct integration | Requires Airbnb Software Partner OAuth/client credentials | Vendor/Ops | Finish partner approval, set `AIRBNB_CLIENT_ID` and `AIRBNB_CLIENT_SECRET`, wire OAuth adapter | Partner dashboard screenshot + worker log | Disable Airbnb connection |
| Production smoke/readiness | Requires deployed domain with real secrets | Dev/Ops | Run `BASE_URL=https://your-domain npm run smoke` and `npm run go-live:check` | Terminal output + `/api/ops/readiness` screenshot | Roll back deployment in hosting provider |
| Live race/overbooking test | Requires staging/prod DB with disposable test inventory | QA/Dev | Fire two concurrent booking attempts for one available room and verify one is rejected/held | DB reservation rows + test log | Cancel test reservations and release inventory |

## Required Production Environment Variables

Minimum required:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
CRON_SECRET=
```

Recommended for full production feature coverage:

```bash
ANTHROPIC_API_KEY=
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=
STRIPE_PRICE_STANDARD=
STRIPE_PRICE_PRO=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
SENTRY_DSN=
IOT_WEBHOOK_SECRET=
MOBILE_KEY_VERIFY_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=
LINE_CHANNEL_SECRET=
```

Optional/vendor-specific:

```bash
OMISE_SECRET_KEY=
OMISE_PUBLIC_KEY=
OMISE_WEBHOOK_SECRET=
BOOKING_COM_WEBHOOK_TOKEN=
BOOKING_COM_API_KEY=
BOOKING_COM_PROPERTY_ID=
AGODA_WEBHOOK_TOKEN=
AGODA_API_KEY=
AGODA_PROPERTY_ID=
AIRBNB_CLIENT_ID=
AIRBNB_CLIENT_SECRET=
ETAX_USERNAME=
ETAX_PASSWORD=
FLOWACCOUNT_API_KEY=
PEAK_API_KEY=
```

## Go-Live Command Sequence

Run on Node 20.x:

```bash
npm ci
npm run check:env
npm run type-check
npm run lint
npm run check
npm run security-check
NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_WORKERS=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build
npm run deploy:check
BASE_URL=https://your-production-domain.com npm run smoke
npm run go-live:check
```

## Evidence Checklist for Sign-Off

| Evidence | Required Before Public Launch |
| --- | --- |
| `npm run check:env` output with no missing required vars | Yes |
| `npm run check` pass log | Yes |
| `npm run security-check` pass log | Yes |
| Production build log | Yes |
| Deployed domain smoke test log | Yes |
| `/api/ops/readiness` screenshot or JSON output | Yes |
| Supabase migration confirmation | Yes |
| Stripe/Omise webhook delivery screenshots if payment enabled | Yes |
| SendGrid delivery test if email enabled | Yes |
| Sentry event screenshot if monitoring enabled | Yes |
| OTA vendor approval/credential screenshots if OTA live sync enabled | Yes |

## Rollback Runbook

1. Keep the last known-good deployment/build ID in the hosting provider.
2. Deploy this version behind a preview/staging URL first.
3. Apply migrations during a maintenance window or before traffic cutover.
4. If app-level errors increase after cutover, roll back hosting deployment first.
5. If DB migration causes issues before traffic cutover, restore from Supabase backup or revert only the latest migration.
6. If external provider issues occur, disable only that provider env/connection and redeploy; the core PMS remains usable.
7. Keep OTA direct workers paused until provider certification is complete; use aggregator fallback for immediate channel-management go-live.

## Final Local Status

The source package is ready for production deployment preparation. It is not possible to honestly mark the service as fully live until production secrets and third-party dashboards have been configured and smoke/readiness checks have been run against the deployed domain.
