# Phase 6 Launch Readiness

P6 locks the product for real customer launch. Fancy features are cute. Incidents are not.

## What was added

- `/dashboard/launch` readiness screen
- `/api/ops/readiness` guarded production checks
- `/api/ops/smoke-test` guarded table smoke test and operational event log
- `npm run check:env`
- `npm run smoke`
- `npm run release:check`
- Security headers in `next.config.js`
- Phase 6 migration for `launch_check_runs` and operational indexes

## Launch gate

Before calling the product production-ready, run:

```bash
npm install
npm run check:env
npm run type-check
npm run build
supabase db push
npm run smoke
```

Then open:

```txt
/dashboard/launch
```

A launch is blocked when any required readiness check fails.

## Required production env

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

## Strongly recommended env

- `CRON_SECRET`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ANTHROPIC_API_KEY`
- `SENTRY_DSN`
- `NEXT_PUBLIC_SENTRY_DSN`

## Manual smoke checklist

- New hotel owner can sign up and finish onboarding
- Staff cannot open owner/admin-only pages
- Reservation can be created, checked in, checked out, and cancelled
- F&B order can be charged to room folio
- Spa booking blocks therapist time collisions
- Stripe checkout opens and webhook writes subscription event
- Automation runner is protected by secret and logs failures
- `/api/health` returns ok or useful degraded status
- `/dashboard/launch` shows ready before customer demo
