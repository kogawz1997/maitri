# P-Round Consolidation Plan (Minimized Rounds)

Updated: 2026-05-06

เป้าหมาย: รวมงานที่ค้างทั้งหมดใน `TODO.md` แล้วจัดเป็น **รอบ P ให้น้อยที่สุด** โดยยังคุมความเสี่ยงก่อน deploy ได้จริง

---

## Status Update

- ✅ **Round P1: Fully Closed** (Critical + High + Medium checklists marked complete in TODO)
- ✅ Round P2: Fully Closed
- ⏳ Round P3: In progress
  - ✅ Item 1 (Search & Hotel Detail UX): Closed on 2026-05-08
  - ✅ Item 2 (Luxury UI system rollout): Closed on 2026-05-08
  - ✅ Item 3 (Trust & SEO): Closed on 2026-05-08
  - ✅ Item 4 (Growth modules): Closed on 2026-05-08
  - ✅ Item 5 (Platform add-ons): Closed on 2026-05-08

---

## Round P1 — Deploy Gate (ต้องจบก่อนปล่อยจริง)

**Definition of Done:**
- ตัดความเสี่ยง production / payment / build reproducibility / OTA communication ให้ครบ
- ผ่าน `npm ci`, `npm run build`, `npm run type-check`

### Scope (รวมจาก TODO)
1. **Build & Lockfile Integrity**
   - regenerate lockfile
   - clean install ผ่าน
   - build ผ่าน
2. **TypeScript deploy blockers**
   - ensure `paymentMethod`, `ratePlanType` อยู่ใน schema และ type-check 0 error
3. **Payment fail-closed checklist**
   - refund / deposit / charge guards + verify no mock success path
4. **Availability/booking correctness**
   - pending payment logic, overbooking lock, cancellation policy engine
5. **OTA production messaging**
   - hide not-ready channels, disclaimer, cron guard, docs readiness split

**Why grouped together:** ทั้งหมดเป็น deploy blocker และ compliance/risk gate

---

## Round P2 — Revenue & Core Guest Flow (ทำครั้งเดียวให้ flow จบ)

**Definition of Done:**
- ลูกค้าจอง-จ่าย-ติดตาม-จัดการ booking ได้ครบ
- ทีมโรงแรมใช้งาน core operations ได้ไม่สะดุด

### Scope (รวมจาก TODO)
1. **Booking flow components**
   - BookingStepper, BookingSummary, GuestForm (Zod), PaymentMethodCard, ConfirmationCard
2. **Guest portal completion**
   - receipt PDF download link
   - review flow (post-checkout)
   - QR check-in, forgot/reset/password verification cleanup
3. **Payment UX completion**
   - PromptPay QR in flow
   - success/pending/failed state linking consistency
4. **Core hotel operations**
   - room type images/upload
   - maintenance
   - F&B POS / Spa booking core pages

**Why grouped together:** ปิด end-to-end conversion journey ในรอบเดียว ลด feedback loop

---

### P2 close summary

- Guest payment outcome pages: success / pending / failed
- Guest password recovery pages: forgot / reset
- Guest portal booking actions: cancel, review, receipt download
- Booking trust surface: trust badges + payment method card

---

## Round P3 — Scale, Growth, UX/SEO (non-blocking แต่ impact สูง)

**Definition of Done:**
- เพิ่ม conversion จาก UX/SEO
- เพิ่มความพร้อม scale และแบรนด์

### Scope (รวมจาก TODO)
1. **Search & Hotel Detail UX**
   - filters/sort/chips/pagination
   - amenities/policies/reviews/map/nearby/complete RoomCard
2. **Luxury UI system rollout**
   - Luxury components + public components extraction
   - page transitions + skeletons + mobile touch UX
3. **Trust & SEO**
   - structured data JSON-LD, breadcrumbs, OG completeness
   - sitemap, robots, canonical URLs
4. **Growth modules**
   - destination/featured/trust sections
   - recently viewed, compare, recommendations, last-minute deals, pre-stay messaging
5. **Platform add-ons**
   - subscription billing, Redis rate-limit (Upstash), PWA manifest/icons, image optimization

**Why grouped together:** งานเพิ่ม conversion/scale ทำหลัง core deploy-safe flow stable

---

## Final minimized-round structure

- **P1:** Deploy Gate + Compliance + Reliability
- **P2:** Revenue/Core Journey Completion
- **P3:** UX/SEO/Growth/Scale

> จากเดิมที่ TODO กระจายหลาย sprint/priority หมวดใหญ่
> แผนนี้ยุบให้เหลือ **3 รอบ P** เพื่อให้รอบส่งงานน้อยที่สุดและยังควบคุมความเสี่ยงได้



## 3P Execution Split (Current Remaining Work)

เพื่อให้ชัดเจนว่า “งานทั้งหมด” แบ่งเป็น 3P แบบปฏิบัติได้ทันที:

### P1 — Production/Deploy Gate
- lockfile + `npm ci` + `npm run build`
- type-check blockers
- payment/OTA production guards

### P2 — Core Guest & Booking Completion
- booking flow UX/components
- portal completion (receipt/review/qr/account flows)
- core ops pages tied to booking completion

### P3 — Scale, SEO, Growth
- hotel detail/search advanced UX
- SEO technicals (schema/canonical/etc.)
- growth modules (recommendation/compare/deals/pre-stay messaging)

> สรุป: ทั้งหมดถูกยุบเหลือ **3P (P1, P2, P3)** เพื่อลดรอบส่งงานให้สั้นที่สุด
