# Phase 10 Closed — Market Dominance

> Completed: May 2026

## สิ่งที่ทำ

### 1. IBE v2 — Promo Codes
- `src/app/api/public/promo/route.ts` — validate code (public, ใช้ใน booking engine)
- `src/app/api/promotions/route.ts` — CRUD สำหรับ dashboard
- `src/app/dashboard/marketing/promos/` — UI จัดการโค้ด
- Support: percent%, fixed ฿, free_night
- Min amount validation, expiry date, max uses, room type restrictions
- Wired เข้า booking engine — input field ขั้นตอนที่ 3

### 2. Mobile Key (NFC/BLE)
- `src/app/api/mobile-key/route.ts` — issue + verify keys
- `src/app/portal/keys/page.tsx` — guest portal: ขอรับ key, แตะเปิดประตู (Web NFC)
- DB: mobile_keys table
- Vendor-agnostic: ตั้งค่า MOBILE_KEY_VENDOR + MOBILE_KEY_API_KEY
- รองรับ: ASSA ABLOY (VingCard), Dormakaba (KABA), Salto Systems, MIWA

### 3. IoT Energy Management
- `src/app/api/iot/route.ts` — GET devices, POST webhook, PATCH command
- `src/app/dashboard/iot/` — dashboard อุปกรณ์ทั้งหมด + สั่งปิด/เปิด
- DB: iot_devices + iot_readings tables
- รองรับ: Tuya Smart (แนะนำสำหรับไทย), Schneider, Delta Controls, KNX
- Auto-action: detect vacant room + AC running → alert
- Webhook URL: /api/iot (รับ readings จาก device)

### 4. Multi-property Loyalty
- `src/app/api/loyalty/route.ts` — earn points, GET member info
- DB: loyalty_programs + loyalty_members + loyalty_transactions
- Cross-hotel: แต้มจากโรงแรมทุกแห่งในเครือรวมกัน
- 4 tiers: Bronze → Silver → Gold → Platinum
- Configurable: points_per_thb, thb_per_point, tier benefits

### 5. AI Revenue Manager Dashboard
- `src/app/dashboard/revenue/` — 3 views: Overview, Forecast, Targets
- KPIs: Revenue 30d, ADR, Occupancy, RevPAR
- Charts: Daily revenue bar chart, Source breakdown, Rate calendar line chart
- ลิงก์ไปยัง AI Dynamic Pricing โดยตรง
- DB: revenue_targets table

### 6. Promo Code in Booking Engine
- Input field ขั้นตอนที่ 3 (Guest Details)
- Validate via `/api/public/promo`
- แสดง discount amount ทันที
- ส่ง promoId ไปพร้อม reservation

## ENV vars ที่ต้องเพิ่ม

```env
# Mobile Key Vendor (เลือก 1)
MOBILE_KEY_VENDOR=assa_abloy       # assa_abloy | dormakaba | salto | miwa
MOBILE_KEY_API_URL=https://api.vendor.com
MOBILE_KEY_API_KEY=xxx
MOBILE_KEY_PROPERTY_ID=xxx

# IoT (Tuya Smart แนะนำ)
IOT_VENDOR_API_URL=https://openapi.tuyaeu.com
IOT_VENDOR_API_KEY=your_access_id
IOT_WEBHOOK_SECRET=random_secret
NEXT_PUBLIC_IOT_ENABLED=true
```

## DB Migration
```
supabase/migrations/00007_phase10.sql
→ promo_codes, group_bookings, mobile_keys, iot_devices, iot_readings,
  loyalty_programs, loyalty_members, loyalty_transactions,
  distribution_channels, revenue_targets
  (10 new tables)
```

## สถานะ Maitri ตอนนี้

Phase 1-10 เสร็จสมบูรณ์:
- ✅ Core PMS (จอง, ห้อง, แขก, บัญชี)
- ✅ AI Inbox (LINE, WA, Email, 14 ภาษา)
- ✅ Channel Manager (6 OTA)
- ✅ Guest Portal + Booking Engine
- ✅ F&B POS + Spa + Maintenance
- ✅ Email automation (pre-arrival, post-stay, night audit)
- ✅ Dynamic Pricing AI
- ✅ Promo codes + Group booking
- ✅ Mobile Key
- ✅ IoT Energy Management
- ✅ Multi-property Loyalty
- ✅ Revenue Manager Dashboard
- ✅ 83 API routes · 51 pages · 72 DB tables
