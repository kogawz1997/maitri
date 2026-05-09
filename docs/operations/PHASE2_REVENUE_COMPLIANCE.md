# Phase 2 Revenue & Compliance Closure

เพิ่ม Stripe subscription checkout, billing portal, webhook, `/dashboard/billing`, migration สำหรับ subscription events, audit indexes, backup ledger และ `scripts/backup-supabase.mjs`.

## Vercel env ที่ต้องใส่

```env
NEXT_PUBLIC_APP_URL=https://your-domain.com
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_STARTER=price_...
STRIPE_PRICE_STANDARD=price_...
STRIPE_PRICE_PRO=price_...
STRIPE_PRICE_ENTERPRISE=price_...
SUPABASE_DB_URL=postgresql://...
```

## Stripe webhook events

- checkout.session.completed
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_failed

## Backup

```bash
SUPABASE_DB_URL="postgresql://..." npm run backup
```

ต้อง restore-test บน staging ด้วย ไม่งั้น backup ก็เป็นแค่เครื่องรางราคาแพง.
