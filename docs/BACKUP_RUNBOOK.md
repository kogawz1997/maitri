# Maitri Backup Runbook

## Goal
Restore hotel operations after database, storage, deployment, or accidental data damage. Charming that civilization relies on a checklist, but here we are.

## Schedule
- Supabase PITR/daily backups: daily, retained at least 14 days.
- Storage bucket export: daily for guest documents, invoices, room photos, and receipts.
- Manual release backup: before every production migration.

## Commands
```bash
npm run backup
npm run go-live:check
```

## Pre-migration backup
1. Confirm `SUPABASE_SERVICE_ROLE_KEY` targets production.
2. Run `npm run backup`.
3. Save output path and checksum in the release ticket.
4. Apply migration.
5. Run smoke tests.

## Restore drill
1. Create a temporary Supabase project.
2. Restore latest database dump or Supabase PITR snapshot.
3. Restore storage bucket export.
4. Set staging env vars to the restored project.
5. Run booking, payment, tenant isolation, and report smoke tests.
6. Record RTO and RPO.

## Acceptance
- RPO <= 24h for normal backup.
- RTO <= 4h for production outage.
- A restore drill must pass at least once before paid launch.
