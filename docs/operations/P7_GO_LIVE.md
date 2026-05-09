# P7 Go-Live Runbook

P7 closes the last production launch layer before taking real hotel customers.

## What was added

- `/dashboard/go-live` Go-Live Control page
- `/api/ops/health` public-safe operational health endpoint
- `/api/ops/go-live-check` authenticated go-live checklist endpoint
- `/api/ops/alerts` manual alert test endpoint
- `/api/ops/rate-limit-test` rate-limit verification endpoint
- In-memory rate limit helper for lightweight API protection
- CSP, HSTS, and stricter production security headers
- `.env.production.example`
- `npm run go-live:check`
- `npm run health`
- `go_live_checks` database table

## Required before real customers

1. Deploy on real HTTPS domain.
2. Set `NEXT_PUBLIC_APP_URL=https://app.yourdomain.com`.
3. Switch Stripe to live mode and configure webhook signing secret.
4. Set `CRON_SECRET` and all Supabase env vars.
5. Configure `OPS_ALERT_WEBHOOK_URL` or Sentry.
6. Run:

```bash
npm install
npm run check:env
npm run type-check
npm run build
npm run go-live:check
supabase db push
```

7. Run the manual business flow:

```txt
Signup -> Verify email -> Create hotel -> Add room -> Create booking -> Check-in -> Add F&B order -> Charge to room -> Take payment -> Generate invoice
```

## Go-live decision

You can mark P7 as closed only when:

- `/api/ops/health` returns `ok`
- `/dashboard/go-live` shows all required checks passing
- Stripe live checkout + webhook work with real live keys
- Alert test sends to your ops channel
- Multi-tenant test confirms Hotel A cannot access Hotel B data

Do not sell before this. Customers are not QA interns, despite what the software industry keeps pretending.
