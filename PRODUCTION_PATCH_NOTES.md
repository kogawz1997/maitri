# Maitri PMS Production Patch Notes

Updated: 2026-05-08

## Current patched status

This package has been patched for production readiness and verified locally with the checks that do not require real production credentials.

Passing checks:

- `npm run check:strict`
- `npm run security-check` - 0 critical issues, 33 non-blocking warnings
- `NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_WORKERS=1 NODE_OPTIONS=--max-old-space-size=2048 npm run build`
- `npm run deploy:check`

See `PRODUCTION_READY_REPORT.md` for the full report, remaining warnings, and the launch checklist.

## Fixes completed in this patch

1. Added missing `next-env.d.ts`.
2. Added required Vercel cron schedules.
3. Prevented Supabase-backed pages from being prerendered at build time by marking them dynamic.
4. Added memory-safe Next.js build worker settings.
5. Removed server-only Supabase service-role secret reference from client-rendered system settings UI.
6. Improved security audit guard detection.
7. Added Zod validation to selected admin API request bodies.
8. Hardened production env and go-live validation scripts.
9. Added smoke-test timeouts.
10. Generated `package-lock.json` for deterministic installs.

## Still required before real go-live

A real go-live sign-off requires production secrets and live services. After setting real environment variables and applying database migrations, run:

```bash
npm ci
npm run check:env
npm run check:strict
npm run security-check
npm run build
npm run deploy:check
BASE_URL=https://your-production-domain.com npm run smoke
npm run go-live:check
```
