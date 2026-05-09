# Maitri 100% Go-live Checklist

## Build
- [ ] `npm ci`
- [ ] `npm run type-check`
- [ ] `npm run build`
- [ ] `npm run test:unit`
- [ ] `npm run test:e2e`
- [ ] `npm run go-live:check`

## Core hotel flow
- [ ] Owner signup and onboarding
- [ ] Hotel, room type, room, and rate setup
- [ ] Guest booking
- [ ] Deposit/partial payment
- [ ] Cancellation quote and cancellation
- [ ] Check-in, room move, extend stay
- [ ] Folio add/split/merge
- [ ] Checkout creates housekeeping task

## SaaS flow
- [ ] Trial expires and locks tenant
- [ ] Feature gates match plan
- [ ] Usage metrics per org
- [ ] Admin impersonation logs audit record

## Integrations
- [ ] Payment webhook signature verified
- [ ] OTA sync cron enabled
- [ ] OTA duplicate/conflict ledger reviewed
- [ ] LINE connect wizard tested
- [ ] TM30 CSV fallback export tested

## Ops
- [ ] Sentry DSN set
- [ ] Uptime monitors configured
- [ ] Backup runbook tested
- [ ] Incident runbook reviewed
- [ ] Restore drill completed
