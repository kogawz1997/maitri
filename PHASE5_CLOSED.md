# Phase 5 Closed — Automation, AI, Localization, OTA Foundation

This patch upgrades Maitri from operational PMS into a more scalable SaaS product layer.

## Added

- Automation Center `/dashboard/automation`
- Automation rules API `/api/automation/rules`
- Cron-safe automation runner `/api/automation/run`
- AI Concierge dashboard `/dashboard/ai-concierge`
- AI Concierge API `/api/ai/concierge`
- Hotel localization settings `/dashboard/localization`
- Localization preferences API `/api/localization/preferences`
- OTA sync foundation `/dashboard/ota`
- OTA connections API `/api/ota/connections`
- OTA sync queue API `/api/ota/sync`
- Phase 5 database migration with tenant-isolated RLS policies

## Required env

```env
CRON_SECRET="replace-with-long-random-secret"
ANTHROPIC_API_KEY="optional-until-ai-live"
```

## Smoke test

```bash
npm install
npm run type-check
npm run build
supabase db push
```

## Production notes

- `/api/automation/run` must be called by Vercel Cron or an external scheduler using `Authorization: Bearer $CRON_SECRET`.
- OTA sync is queued and provider-ready, not a live official OTA connector yet. Add provider credentials and adapters before enabling real push/pull.
- AI Concierge logs every suggestion so staff can audit output before giving it too much power, because letting bots free-write to guests unattended is how small disasters grow legs.
