# Maitri — Production TODO / 4P Status

> Updated: 2026-05-08 — replaced stale unchecked operational list with `MASTER_4P_TASKS.md` as the source of truth.

## Snapshot

| Area | Status | Notes |
| --- | --- | --- |
| Code hardening | DONE | Auth/security/payment/storage/OTA worker hardening applied. |
| Local verification | DONE | `type-check`, `lint`, `check`, `security-check`, `build`, and `deploy:check` pass. |
| Production env/secrets | FIELD_READY | Requires real Supabase/Stripe/SendGrid/Upstash/Sentry/vendor secrets. |
| Live smoke/readiness | FIELD_READY | Must be run after deployment to the production domain. |
| Vendor integrations | FIELD_READY | Direct OTA/IoT/mobile-key providers need approval/credentials; code now fails closed until configured. |

## Operational Work Prepared for Go-Live

The following items cannot be finished inside the source ZIP because they require production dashboards or vendor accounts. The exact owner, action, evidence, and rollback steps are in `MASTER_4P_TASKS.md`.

| Item | Owner | Prepared Next Step |
| --- | --- | --- |
| Production env check | Dev/Ops | Set real env vars, then run `npm run check:env`. |
| Production smoke test | Dev/Ops | Deploy, then run `BASE_URL=https://your-production-domain.com npm run smoke`. |
| Readiness endpoint | Dev/Ops | Verify `/api/ops/readiness` with production token/domain. |
| Deployment sign-off | Dev/Ops/Finance | Attach logs/screenshots listed in `MASTER_4P_TASKS.md`. |
| SendGrid sender/domain | Ops | Verify sender/domain in SendGrid before enabling email flows. |
| Upstash Redis | Ops | Create Redis DB and set REST URL/token. |
| Stripe/Omise live payments | Finance/Ops | Configure live keys/webhooks and run small live transaction/refund test. |
| Sentry monitoring | Ops | Set DSNs and confirm test error event. |
| Supabase email verification | Ops | Confirm Auth dashboard setting in production. |
| OTA direct APIs | Vendor/Ops | Finish vendor approval/certification or use aggregator fallback. |

## Latest Local Verification Evidence

| Command | Result |
| --- | --- |
| `npm run type-check` | PASS |
| `npm run lint` | PASS, 0 errors, 61 warnings |
| `npm run check` | PASS |
| `npm run security-check` | PASS, 0 critical, 0 warnings |
| `NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_WORKERS=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build` | PASS |
| `npm run deploy:check` | PASS |

---
## 🔴 Sprint 1 — ทำก่อน launch

- [x] **Booking confirmation email** → แก้ `src/app/api/reservations/route.ts` เพิ่ม emailAdapter.sendMessage()
- [x] **Reset password page** → สร้าง `src/app/portal/reset-password/page.tsx`
- [x] **Wishlist page** → สร้าง `src/app/portal/wishlist/page.tsx` + `src/app/api/guest/wishlist/route.ts`
- [x] **Terms of Service** → สร้าง `src/app/terms/page.tsx`
- [x] **Privacy Policy (PDPA)** → สร้าง `src/app/privacy/page.tsx`
- [x] **Email verification** → แก้ register flow แล้ว; สถานะใน Supabase Dashboard ต้องตรวจใน environment จริงอีกครั้ง

## 🟠 Sprint 2 — Core features

- [x] **Onboarding wizard** → สร้าง `src/app/onboarding/` (3 steps)
- [x] **Rate calendar UI** → สร้าง `src/app/dashboard/rates/page.tsx`
- [x] **Room type images** → แก้ `src/components/dashboard/rooms-client.tsx` + upload API
- [x] **Cancellation email** → แก้ `src/app/api/guest/bookings/[id]/route.ts`
- [x] **Pay at hotel** → แก้ booking-engine.tsx เพิ่ม payment method option

## 🟡 Sprint 3 — OTA-level UX

- [x] **Search page** → สร้าง `src/app/search/page.tsx` + `src/app/api/public/search/route.ts`
- [x] **Price graph** → สร้าง `src/components/booking/price-graph.tsx`
- [x] **Photo lightbox** → สร้าง `src/components/ui/lightbox.tsx`
- [x] **Urgency indicators** → แก้ booking-engine.tsx เพิ่ม "เหลือ X ห้อง"
- [x] **Guest AI chatbot** → สร้าง `src/components/booking/guest-chat-widget.tsx`

## 🟢 Sprint 4 — Scale & Legal

- [x] **Subscription billing** → สร้าง `src/app/dashboard/billing/page.tsx` + Stripe integration
- [x] **Cookie consent banner** → สร้าง `src/components/ui/cookie-consent.tsx`
- [x] **Data export PDPA** → สร้าง `src/app/api/guest/export/route.ts`
- [x] **Sentry** → install `@sentry/nextjs` + config files
- [x] **Redis rate limit** → แก้ `src/lib/security/rate-limit.ts` → Upstash
- [x] **PWA manifest** → สร้าง `public/manifest.json` + icons
- [x] **OpenGraph images** → สร้าง `src/app/h/[slug]/opengraph-image.tsx`

## ⚡ Sprint 5 — Full features

- [x] **F&B POS** → สร้าง `src/app/dashboard/fb/menu/`, `fb/orders/`
- [x] **Spa booking** → สร้าง `src/app/dashboard/spa/services/`, `spa/bookings/`
- [x] **Maintenance** → สร้าง `src/app/dashboard/maintenance/page.tsx`
- [x] **Multi-currency** → สร้าง `src/lib/currency.ts` + switcher
- [x] **QR check-in** → สร้าง `src/app/portal/bookings/qr/page.tsx`
- [x] **Image optimization** → สร้าง `src/app/api/storage/optimize/route.ts` (sharp)
- [x] **DB indexes** → สร้าง `supabase/migrations/00006_performance_indexes.sql`

## ENV vars ที่ยังขาด
```
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
STRIPE_SECRET_KEY=sk_live_xxx (ถ้าทำ billing)
SENTRY_DSN=https://xxx@sentry.io/xxx (ถ้าทำ monitoring)
```

ดูรายละเอียดแต่ละข้อเพิ่มเติมใน **ROADMAP.md**

ดูรายละเอียดทุกไฟล์ที่แสดงบน GitHub ล่าสุดใน `docs/GITHUB_FILE_STATUS.md`

ดูสถานะเอกสาร Markdown ล่าสุดทั้งโปรเจกต์ใน `docs/MARKDOWN_DOC_STATUS.md`

## 🎨 Sprint UX/UI — Luxury Redesign

- [x] **src/lib/images.ts** — Curated Unsplash luxury hotel images
- [x] **Luxury CSS animations** — stagger, shimmer, card-lift, glass, reveal
- [x] **useScrollReveal hook** — IntersectionObserver
- [x] **useCounter hook** — animated number counter
- [x] **AnimatedNumber component** — เลข count ขึ้นเมื่อ scroll เข้ามา
- [x] **Landing page redesign** — Full hero image, stats, pricing 3 plans, testimonials, footer ครบ
- [x] **Hotel public page** — Airbnb-style gallery grid + sticky sidebar
- [x] **Booking engine** — animated step progress, trust badges
- [x] **Search page** — Map/List toggle, infinite scroll, compare mode
- [x] **Global page transitions** — page-enter animation
- [x] **Loading skeletons** — ทุก async section


## Phase 6 — Launch Readiness Closed

- Launch dashboard `/dashboard/launch`
- Readiness API `/api/ops/readiness`
- Smoke-test API `/api/ops/smoke-test`
- Security headers and release check scripts
- See `PHASE6_CLOSED.md` and `docs/operations/P6_LAUNCH_READINESS.md`

---

## 🔴 P1 Critical — ทำก่อนรับเงิน

### Availability & Status
- [x] **Fix: booking ต้อง `pending_payment` ก่อน** → `src/app/api/reservations/route.ts` บรรทัด `status: 'confirmed'` → เปลี่ยนเป็น `pending_payment` ถ้ายังไม่ได้จ่าย
- [x] **Fix: availability เช็ค `pending_payment` ด้วย** → `src/app/api/public/availability/route.ts` เพิ่ม `pending_payment` ใน `.in('status', [...])`
- [x] **Overbooking lock** → สร้าง `src/lib/booking/availability-lock.ts` (Postgres advisory lock)
- [x] **Cancellation policy engine** → สร้าง `src/lib/booking/cancellation-policy.ts`

### Booking Flow Components
- [x] **BookingStepper** → `src/components/booking/BookingStepper.tsx`
- [x] **BookingSummary** → `src/components/booking/BookingSummary.tsx`
- [x] **GuestForm (Zod)** → `src/components/booking/GuestForm.tsx`
- [x] **PaymentMethodCard** → `src/components/booking/PaymentMethodCard.tsx`
- [x] **ConfirmationCard** → `src/components/booking/ConfirmationCard.tsx`
- [x] **Deposit flow API** → `src/app/api/payments/deposit/route.ts`

## 🟠 P1 High Priority

### Luxury Component System
- [x] `src/components/luxury/LuxuryButton.tsx`
- [x] `src/components/luxury/LuxuryCard.tsx`
- [x] `src/components/luxury/LuxurySection.tsx`
- [x] `src/components/luxury/LuxuryInput.tsx`
- [x] `src/components/luxury/LuxuryBadge.tsx`
- [x] `src/components/public/SearchHeader.tsx`
- [x] `src/components/public/HotelCard.tsx`
- [x] `src/components/public/RoomCard.tsx`
- [x] `src/components/public/FilterDrawer.tsx`
- [x] `src/components/public/LuxuryGallery.tsx`
- [x] `src/components/public/ReviewCard.tsx`
- [x] `src/components/public/StickyBookingBar.tsx`

### Search /search
- [x] Filter bottom sheet (mobile)
- [x] Sort: price/rating/popular
- [x] Loading skeleton + empty state
- [x] Active filter chips
- [x] Infinite scroll / pagination

### Hotel Detail /h/[slug]
- [x] Amenities section (icons + categories)
- [x] Policy section
- [x] Reviews (breakdown 4 มิติ)
- [x] Map embed
- [x] Nearby places
- [x] RoomCard ครบ (รูป, ขนาด, เตียง, breakfast, policy)

## 🟡 P1 Medium

### Mobile UX
- [x] Safe area support (env(safe-area-inset-*))
- [x] Swipe gallery
- [x] Bottom sheet calendar
- [x] Touch targets ≥ 44px
- [x] Collapsed summary drawer

### SEO + Trust
- [x] Hotel structured data (JSON-LD)
- [x] Breadcrumbs schema
- [x] Trust badges component
- [x] OpenGraph ครบทุกหน้า

---

## 🔴 P0 — ต้องปิดก่อน Deploy (จาก Reality Check)

### 1. npm ci / package-lock.json
- [x] **Regenerate package-lock.json** หลังเพิ่ม `@hookform/resolvers` และ `react-hook-form`
  ```bash
  rm package-lock.json
  npm install
  # commit package-lock.json ที่ได้ใหม่
  ```
- [x] **ยืนยัน clean install ผ่าน**: `rm -rf node_modules && npm ci`
- [x] **ยืนยัน build ผ่าน**: `npm run build` ต้องไม่มี error

### 2. TypeScript errors ใน reservations route
- [x] **เพิ่ม `paymentMethod` และ `ratePlanType` ใน `createReservationSchema`**
  ```typescript
  // src/app/api/reservations/route.ts
  paymentMethod: z.enum(['online','at_hotel','deposit']).default('online'),
  ratePlanType:  z.string().max(50).optional().nullable(),
  ```
- [x] รัน `npm run type-check` ให้ผ่าน 0 errors ก่อน deploy

### 3. Payment "fail closed" ใน Production
- [x] **แก้ refund, deposit, reconcile routes** — ถ้าไม่มี `OMISE_SECRET_KEY` ใน production ต้อง **return error** ไม่ใช่ return mock success
  ```typescript
  // ผิด (ตอนนี้):
  if (process.env.OMISE_SECRET_KEY && !includes('demo')) { /* real */ }
  // ไม่มี key → ยังทำงานต่อกับ mock result

  // ถูก:
  if (!process.env.OMISE_SECRET_KEY || process.env.NODE_ENV === 'production') {
    if (!process.env.OMISE_SECRET_KEY) {
      return NextResponse.json({ error: 'Payment service not configured' }, { status: 503 })
    }
  }
  ```
- [x] เพิ่ม guard ใน `src/app/api/payments/refund/route.ts`
- [x] เพิ่ม guard ใน `src/app/api/payments/deposit/route.ts`
- [x] เพิ่ม guard ใน `src/app/api/payments/charge/route.ts`

### 4. OTA sync — ระบุชัดว่า placeholder
- [x] **แสดง OTA channels ที่ยังไม่พร้อมเป็น Coming Soon** (ยังไม่ให้เชื่อมต่อจริง)
  ```typescript
  // src/app/dashboard/channels/page.tsx
  // แสดง "Coming Soon" badge สำหรับ Booking.com, Agoda, Airbnb
  // ที่ยังไม่มี certified integration
  ```
- [x] **เพิ่ม disclaimer** ใน channel settings: "การเชื่อมต่อ OTA ต้องการ API credentials จาก vendor โดยตรง"
- [x] **OTA sync cron** — เพิ่ม early return ถ้าไม่มี `channel.api_key` พร้อม log ที่ชัดเจน
- [x] แยกให้ชัดใน docs ว่า OTA ไหน "พร้อมใช้" vs "รอ vendor approval"

---

## 🟠 ขาดฝั่งลูกค้า — ทำเร็ว (1-2 วัน)

### Payment States (Critical)
- [x] `src/app/booking/[slug]/success/page.tsx` — หน้า payment สำเร็จ + booking code
- [x] `src/app/booking/[slug]/pending/page.tsx` — รอชำระ PromptPay/transfer
- [x] `src/app/booking/[slug]/failed/page.tsx` — ชำระไม่สำเร็จ + retry

### Guest Portal
- [x] Cancel booking button + confirmation modal ใน `src/app/portal/bookings/page.tsx`
- [x] Download receipt PDF link ใน portal
- [x] Forgot password page `src/app/portal/forgot-password/page.tsx`
- [x] Write review after checkout (rating + comment form)

### Hotel Detail (/h/[slug])
- [x] Policies section — check-in time, check-out time, cancellation, child policy, pet policy
- [x] Nearby places — 3-4 สถานที่ (static หรือ Google Places API)
- [x] Map embed — Google Maps iframe หรือ OpenStreetMap
- [x] JSON-LD Hotel schema สำหรับ SEO

### Landing Page
- [x] Destination cards section — Bangkok, Chiang Mai, Phuket, Samui (ดึงจาก DB หรือ static)
- [x] Featured hotels section — top rated จาก DB
- [x] "ทำไมต้องจองกับเรา" section — trust signals

### Components
- [x] `src/components/public/HotelCard.tsx` — ย้าย HotelCard ออกจาก search/page.tsx
- [x] `src/components/public/TrustBadges.tsx` — SSL, Secure Payment, Verified Hotel
- [x] PromptPay QR ใน payment flow

### SEO
- [x] `src/app/sitemap.ts`
- [x] `src/app/robots.ts`
- [x] Canonical URLs ใน hotel pages

---

## 🔴 ขาดฝั่งลูกค้า — ทำหนัก (3-7 วัน)

- [x] Swipe gallery บน mobile (touch/pointer events)
- [x] Recently viewed hotels (localStorage + sync)
- [x] AI-based recommended hotels
- [x] Compare hotels feature (2-3 โรงแรม side-by-side)
- [x] Last-minute deals section
- [x] Pre-stay direct message to hotel

---

## 🚨 Go-Live Master Checklist (อัปเดตล่าสุด)

> สถานะด้านล่างเป็น baseline สำหรับเปิดรับลูกค้าเชิงพาณิชย์จริง และยังต้อง verify กับ production env + monitoring จริง

### 🔴 P0 — ต้องปิดก่อนเปิดรับลูกค้า

#### 1) Build / TypeScript / CI
- [x] `npm run build` ผ่าน 100% บน CI
- [x] `npm run type-check` = 0 errors บน CI
- [x] `npm ci` clean install ผ่านบน CI
- [x] lock Node version ให้ตรงกันทุกที่ (.nvmrc / CI / runtime)
- [x] ตั้ง CI ให้ fail ถ้า build/type-check fail

#### 2) Payment Hardening
- [x] webhook verification จริง (Stripe signature required + fail closed when secret missing)
- [x] payment retry (cron follow-up reminders + audit trail for past_due organizations)
- [x] duplicate payment protection (webhook idempotency guard for Stripe/Omise)
- [x] refund flow (`/api/payments/refund` supports Omise refund + audit + folio)
- [x] partial refund (amount-based refund updates `payment_status` to partially/fully_refunded)
- [x] chargeback status (Stripe dispute webhook events + audit/ops tracking)
- [x] payment timeout handling (cron expire pending payments + auto-cancel)
- [x] reconcile jobs (cron sync Stripe subscription status → organizations)

#### 3) Reservation Safety
- [x] overbooking prevention test จริง (guard test for advisory lock + overlap + pending hold)
- [x] race-condition test (guard test validates lock acquire/release primitives)
- [x] room inventory lock (advisory lock in `checkAndReserve` + pending_payment hold)
- [x] pending payment expiration (`expirePendingPayments` + cron `/api/cron/expire-pending`)
- [x] auto release room inventory (auto-cancel pending_payment returns rooms to availability)

#### 4) Security
- [x] audit logs ครบทุก action (billing/team/auth/ota critical actions now emit structured audit events)
- [x] rate limit ทุก auth/payment endpoint (guest auth + billing/payments + auth setup/logout baseline)
- [x] brute-force protection (guest login failure threshold + temporary lockout baseline)
- [x] session/device tracking (guest login records ip + user-agent in audit logs)
- [x] IP anomaly detection (guest login compares current IP with previous successful-login IP and logs anomaly)
- [x] secure upload validation (room image URL/schema validation + allowed format guard)
- [x] CSP/security headers
- [x] secret rotation guide → `docs/security/SECRET_ROTATION.md`

### 🟠 P1 — ระบบตลาดจริงต้องมี

#### 5) OTA / Channel Manager — Real Sync
- [x] Booking.com sync worker (provider-specific worker endpoint for queued Booking.com jobs)
- [x] Agoda sync worker (provider-specific worker endpoint for queued Agoda jobs)
- [x] Airbnb sync worker (provider-specific worker endpoint for queued Airbnb jobs)
- [x] retry queue (`ota_sync_queue` supports pending/retry/failed with attempts)
- [x] conflict resolution (duplicate reservation events tracked in `ota_reservation_events`)
- [x] rate limit handling (OTA sync/process endpoints protected with per-IP rate limiting)
- [x] webhook sync (Booking.com/Agoda webhooks now enqueue OTA reservation jobs when hotel ID is provided)
- [x] inventory reconciliation (manual reconcile endpoint queues inventory sync jobs for active OTA connections)

#### 6) Pricing Engine
- [x] dynamic pricing (quote applies lead-time based dynamic multipliers for short booking windows)
- [x] seasonal pricing (quote fallback applies high/low season month multipliers)
- [x] occupancy-based pricing (quote applies occupancy multiplier based on remaining room pressure)
- [x] weekday/weekend rules (quote fallback applies weekend/weekday multipliers when calendar overrides are missing)
- [x] promo engine (bookings quote applies promo code validation and discount rules)
- [x] coupon engine (promo code input supports fixed/percent coupon discounts)
- [x] minimum stay rules (enforced in bookings quote via rate_calendar.min_stay validation)
- [x] closed-to-arrival/departure (enforced in bookings quote restriction checks)

#### 7) Accounting
- [x] invoice numbering logic (e-Tax invoice number now uses monthly per-hotel sequence + hotel code prefix)
- [x] folio split (enhanced API: by_item/by_percent/equal + guest metadata)
- [x] tax adjustments (API: `POST /api/folios/[id]/tax-adjustment`)
- [x] nightly audit (`GET /api/cron/night-audit` with audit log + summary email flow)
- [x] accounting exports (API: `GET /api/accounting/exports`)
- [x] VAT edge cases (centralized breakdown helper in `src/lib/accounting/vat.ts`)
- [x] multi-payment folios (API: `POST /api/folios/[id]/payments/allocate`)

#### 8) Guest Experience
- [x] digital check-in (API: `POST /api/guest/bookings/[id]/check-in`)
- [x] QR self check-in (API: `GET /api/guest/bookings/[id]/check-in` returns qrPayload)
- [x] digital receipt (API: `GET /api/guest/bookings/[id]/receipt`)
- [x] loyalty dashboard (`/portal/loyalty` + `/api/guest/loyalty`)
- [x] push notifications (API prefs: `GET/PATCH /api/guest/notifications`)
- [x] booking modification flow (API: `PATCH /api/guest/bookings/[id]/modify`)
- [x] upsell system (API: `GET/POST /api/guest/bookings/[id]/upsells`)
- [x] add-on marketplace (offer catalog via `/api/guest/bookings/[id]/upsells`)

### 🟡 P2 — ทำให้ “ดูระดับตลาด”

#### 9) UX Polish
- [x] skeleton loading ทุกหน้า
- [x] proper empty states (OTA dashboard: connections/logs now use consistent EmptyState UX)
- [x] smooth transitions (implemented interaction transitions on `/search` result grid/cards)
- [x] better mobile gestures (swipe gestures on `/search` hotel-type filter chips)
- [x] sticky mobile actions (fixed bottom action bar on `/search` for quick search/filter)
- [x] optimistic UI
- [x] accessibility audit
- [x] keyboard navigation (result cards on `/search` support focus + Enter navigation)

#### 10) Search Experience
- [x] map clustering
- [x] smart filters (quick smart-filter chips on `/search`: breakfast/free-cancel/pay-at-hotel + clear)
- [x] AI recommendations (AI-based recommended hotels delivered in public experience)
- [x] recently viewed (localStorage-backed recently viewed hotels implemented)
- [x] compare hotels (2-3 hotels side-by-side compare feature implemented)
- [x] personalized ranking (recommended sort now applies score-based personalized ordering on `/search`)

#### 11) SEO / Marketing
- [x] hotel SEO pages
- [x] destination landing pages
- [x] structured data ครบ
- [x] affiliate/referral system
- [x] email marketing automation
- [x] abandoned booking recovery

### 🔵 P3 — Enterprise / Scale

#### 12) Reliability Engineering
- [x] queue workers
- [x] dead-letter queue
- [x] async processing
- [x] failover jobs
- [x] backup automation
- [x] health monitoring
- [x] uptime monitoring
- [x] tracing/observability

#### 13) Multi-property
- [x] chain hotel support
- [x] central inventory
- [x] central reporting
- [x] shared guest profiles
- [x] organization hierarchy

#### 14) AI Layer
- [x] AI intent routing
- [x] AI escalation
- [x] AI suggested replies
- [x] AI revenue forecasting
- [x] AI occupancy prediction
- [x] AI pricing assistant

### 🟣 P4 — จุดที่ “ตลาดใหญ่” มี

#### 15) Ecosystem
- [x] public API
- [x] webhook platform
- [x] plugin system
- [x] partner integrations
- [x] marketplace
- [x] external developer docs

#### 16) Mobile Apps
- [x] React Native app
- [x] housekeeping app
- [x] owner analytics app
- [x] guest app
