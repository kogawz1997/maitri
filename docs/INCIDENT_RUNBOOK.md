# Maitri Incident Runbook

## Severity
- SEV1: booking/payment unavailable, tenant data leak, production auth failure.
- SEV2: OTA sync degraded, email delivery failure, admin dashboard unavailable.
- SEV3: cosmetic/UI bug, delayed report export, non-critical integration issue.

## First 10 minutes
1. Check `/api/health` and `/api/ops/health`.
2. Check Sentry for the release and top error.
3. Check Vercel deployment status and rollback button.
4. Check Supabase health and database error rate.
5. Pause risky crons if they are duplicating work.

## Communication
- SEV1: notify owner/admins immediately.
- Update every 30 minutes until mitigated.
- Write customer-facing message without blame or heroic nonsense.

## Mitigation playbooks
### Payment/webhook failure
- Disable payment capture if duplicate charge risk exists.
- Verify webhook signatures and idempotency keys.
- Reconcile payments manually from provider dashboard.

### OTA sync failure
- Stop OTA cron if it creates conflicts.
- Mark channel as degraded.
- Retry failed ledger items after root cause is fixed.

### Tenant isolation concern
- Disable affected route.
- Rotate service role keys.
- Export audit logs.
- Notify affected tenants following PDPA process.

## After incident
- Write RCA within 48h.
- Add regression test.
- Add monitor if missing.
