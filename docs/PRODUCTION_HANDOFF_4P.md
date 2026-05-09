# 4P Production Handoff

Use `MASTER_4P_TASKS.md` at the repository root as the master checklist. This document is a short operational handoff for the launch team.

## What Dev Completed

- Security audit is clean: 0 critical, 0 warnings.
- TypeScript, lint, tests, production build, and deploy-target checks pass locally.
- Auth, payment, storage, OTA worker, IoT, mobile-key, and high-risk API routes were hardened.
- OTA direct integrations are now staged/fail-closed instead of falsely reporting successful provider sync.
- Production env templates include the remaining vendor credentials needed for live setup.

## What Ops/Vendors Must Complete

1. Configure real production env vars in the host.
2. Apply Supabase migrations.
3. Verify Supabase Email auth behavior in dashboard.
4. Configure SendGrid, Upstash, Sentry, Stripe/Omise, and any OTA vendor credentials that will go live.
5. Deploy to staging/preview first, then run smoke/readiness checks.
6. Attach evidence listed in `MASTER_4P_TASKS.md` before final public traffic cutover.

## Recommended Launch Mode

- Core PMS / direct booking / guest portal: ready after prod env and DB migration verification.
- Billing/payments: enable after Stripe/Omise live webhook test.
- OTA sync: launch through an approved aggregator first if direct Booking.com/Agoda/Airbnb certification is not complete.
- IoT/mobile key: enable per property only after vendor sandbox/live credential verification.
