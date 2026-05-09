# Production Readiness Report - Maitri PMS

Updated: 2026-05-08

## Status

The project has been patched as far as possible inside the source code and sandbox environment. It is now **production-build ready** and **go-live prepared**, with external/vendor items clearly separated into a field handoff.

A fully public launch still requires real production secrets, Supabase production access, vendor dashboards, and smoke/readiness evidence from the deployed production domain. Those cannot be completed honestly from the ZIP alone, so they are documented in `MASTER_4P_TASKS.md`.

## Verification Results

| Check | Command | Result |
| --- | --- | --- |
| TypeScript | `npm run type-check` | Passed |
| Lint | `npm run lint` | Passed, 0 errors, 61 warnings |
| Core/unit/static E2E/final checks | `npm run check` | Passed |
| Security audit | `npm run security-check` | Passed, 0 critical, 0 warnings |
| Production build | `NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_WORKERS=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build` | Passed |
| Deployment target files | `npm run deploy:check` | Passed |

## Main Fixes Completed

### Build and Deployment

- Kept deterministic install support with `package-lock.json`.
- Verified production build after the latest hardening changes.
- Verified deployment target files for Docker, Railway, Fly, Koyeb, Render, PM2, and GitHub deploy-check workflow.
- Preserved memory-safe Next.js build settings for smaller CI/Vercel/Docker runners.

### Security and Auth

- Added guest-auth brute-force protection backed by audit logs.
- Added guest login/session/device/IP anomaly audit logging.
- Added rate limits and Zod/manual schema validation to additional high-risk API routes.
- Added upload MIME/path/URL validation helpers and applied them to storage and room image routes.
- Hardened IoT and mobile-key routes to fail closed in production when required secrets are missing.
- Updated the internal security audit script; the project now reports 0 security warnings and 0 critical issues.

### Payment and Billing

- Fixed Stripe billing webhook idempotency by storing provider event IDs in JSONB changes instead of comparing them against UUID entity IDs.
- Fixed Stripe invoice/dispute audit logging so provider IDs are not written into UUID columns.
- Fixed Omise webhook idempotency with JSONB event tracking.
- Added provider-secret fail-closed behavior to reconciliation flows.
- Added/confirmed rate limits for billing/payment endpoints.

### OTA / Channel Manager

- Reworked Booking.com, Agoda, and Airbnb provider workers so they no longer mark staged work as successful. Until vendor credentials/certification are complete, jobs are marked `skipped` with exact setup details.
- Fixed provider worker log statuses to match DB constraints.
- Added OTA webhook connection resolution so Booking.com/Agoda webhooks map external property IDs to active hotel connections instead of inserting external IDs into `hotel_id` UUID columns.
- Patched legacy channel dashboard writes to use the real `channel_connections` schema: `status`, `external_property_id`, `credentials`, and `config`.
- Added OTA provider env placeholders for direct API/webhook setup.

### Reservation Safety

- Confirmed the advisory-lock availability guard and static unit policy test.
- Production/staging concurrent race testing remains a field task because it requires a live Supabase database and disposable test inventory.

## Verification Log Files

Local evidence logs are included in `docs/verification/`:

- `check-strict-final.log`
- `security-check-final.log`
- `build-final.log`
- `deploy-check-final.log`

## Important Remaining Production Requirements

These are tracked in detail in `MASTER_4P_TASKS.md`.

- Set real production env vars in the hosting provider.
- Apply all Supabase migrations, including `20260508123000_guest_auth_security_hardening.sql`.
- Verify Supabase Email authentication behavior in the production dashboard.
- Configure SendGrid sender/domain, Upstash Redis, Sentry, Stripe/Omise, and any vendor integrations that will be enabled at launch.
- Deploy to a real domain and run smoke/readiness checks against that domain.
- Attach launch evidence before public cutover.

## Recommended Launch Sequence

Use Node 20.x.

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

## Non-Blocking Warnings Still Visible

`npm run lint` still reports 61 warnings and 0 errors. These warnings do not block the current production checks but should be cleaned up after launch-hardening:

- `@next/next/no-img-element`: replace plain `<img>` tags with `next/image` where appropriate.
- `react-hooks/exhaustive-deps`: review hook dependency arrays.

## Final Assessment

The codebase is now in a stronger production-ready state than the uploaded ZIP. Core PMS, booking, guest portal, billing scaffolding, OTA scaffolding, storage, security, and deployment checks are prepared. The remaining work is operational/vendor setup rather than source-code completion.
