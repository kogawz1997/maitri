# Phase 4 Closed — Revenue Features

รอบนี้ปิด P4 แบบใช้งานจริง ไม่ใช่ placeholder สวย ๆ ที่เอาไว้หลอก dashboard ให้ดูมีชีวิต

## Included

- F&B POS UI at `/dashboard/fb`
- F&B menu quick add API: `/api/fb/menu`
- F&B order API: `/api/fb/orders`
- Order lifecycle: `open → preparing → served → paid/cancelled`
- `paid + room_charge` posts into guest folio once, with folio total recalculation
- Spa booking UI at `/dashboard/spa`
- Spa service quick add API: `/api/spa/services`
- Spa booking API: `/api/spa/bookings`
- Therapist time collision validation
- Spa booking can post charge into folio when linked to a reservation
- Analytics page at `/dashboard/analytics`
- Analytics API at `/api/analytics/summary`
- Payment receipt PDF route at `/api/invoices/payment/[paymentId]`
- Phase 4 migration: indexes + explicit RLS WITH CHECK for F&B/Spa tables

## Required commands

```bash
npm install
npm run type-check
npm run build
supabase db push
```

## Production smoke test

1. Add one F&B menu item.
2. Create an F&B order linked to an active reservation.
3. Move order to `paid` and confirm `folio_items` has `reference_type = fb_order`.
4. Add one spa service.
5. Create spa booking with therapist.
6. Try booking the same therapist at overlapping time, it must return 409.
7. Open `/dashboard/analytics` and confirm F&B/Spa values change.
8. Open `/api/invoices/payment/<paymentId>` and confirm PDF renders.
