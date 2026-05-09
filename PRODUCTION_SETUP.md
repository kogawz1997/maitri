# 🚀 Maitri — Production Setup Guide

> คู่มือตั้งค่าครบทุกอย่างก่อน go-live จริง
> อ่านทีละขั้น ทำตามลำดับ

---

## ✅ Checklist ก่อน Launch

```
[ ] Supabase database + migrations
[ ] Vercel deployment
[ ] Domain + SSL
[ ] Upstash Redis (rate limiting)
[ ] Stripe (billing)
[ ] SendGrid (email)
[ ] Sentry (error monitoring)
[ ] LINE Messaging API
[ ] Supabase email verification ON
[ ] PWA icons generated
[ ] ทดสอบ booking flow จริง
```

---

## 1. Supabase Setup

### 1.1 สร้าง Project
1. ไป [supabase.com](https://supabase.com) → New Project
2. Region: **Southeast Asia (Singapore)**
3. Password: บันทึกไว้ (จะใช้สำหรับ DB URL)

### 1.2 Run Migrations
```bash
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase db push
```

หรือ manual: ไป Supabase Dashboard → SQL Editor → copy/paste ทีละไฟล์:
```
supabase/migrations/00001_initial_schema.sql
supabase/migrations/00002_production_saas_hardening.sql
supabase/migrations/00003_team_audit_improvements.sql
supabase/migrations/00004_hotel_gallery_and_branding.sql
supabase/migrations/00005_guest_portal.sql
supabase/migrations/00006_performance_indexes.sql
```

### 1.3 เปิด Email Verification
Dashboard → **Authentication → Email** → เปิด:
- ✅ Enable email confirmations
- ✅ Secure email change
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/portal/login?verified=1`

### 1.4 Storage Buckets
Dashboard → **Storage** → Create bucket:
- Name: `hotel-assets`
- Public: ✅ YES
- File size limit: 50MB
- Allowed types: `image/jpeg, image/png, image/webp, image/gif`

### 1.5 ENV vars จาก Supabase
Dashboard → Project Settings → API:
```env
NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 2. Vercel Deployment

### 2.1 Push to GitHub
```bash
git init && git add . && git commit -m "Maitri PMS v1.0"
git remote add origin https://github.com/YOUR_USER/maitri.git
git push -u origin main
```

### 2.2 Import ใน Vercel
1. [vercel.com/new](https://vercel.com/new) → Import GitHub repo
2. Framework: **Next.js**
3. Root Directory: `.` (เว้นว่าง)
4. **อย่า deploy ก่อน** — ตั้ง ENV vars ก่อน

### 2.3 ตั้ง ENV vars ใน Vercel
Dashboard → Project → Settings → Environment Variables → เพิ่มทุกตัวจาก `.env.demo`

**Required (ขาดแล้ว deploy ไม่ได้):**
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=        # สร้างเอง: openssl rand -hex 32
```

### 2.4 Deploy
กด Deploy — รอ ~3 นาที

### 2.5 Custom Domain
Vercel → Project → Settings → Domains → Add domain

---

## 3. Upstash Redis (Rate Limiting)

**ทำไมต้องมี:** Vercel serverless reset memory ทุก cold start → rate limit in-memory ใช้ไม่ได้จริง

### 3.1 สมัคร
1. [upstash.com](https://upstash.com) → Sign up (ฟรี)
2. Create Database → Region: **ap-southeast-1 (Singapore)**
3. Type: **Redis**

### 3.2 Copy credentials
Database → REST API tab:
```env
UPSTASH_REDIS_REST_URL=https://XXXXX.upstash.io
UPSTASH_REDIS_REST_TOKEN=XXXXXXXXXX
```

### 3.3 เพิ่มใน Vercel ENV vars + redeploy

**Free tier:** 10,000 requests/day — เพียงพอสำหรับโรงแรมเล็ก-กลาง

---

## 4. Stripe (Subscription Billing)

**ทำไมต้องมี:** เก็บเงินค่า subscription จากโรงแรมที่ใช้ Maitri

### 4.1 สมัคร
[stripe.com](https://stripe.com) → Sign up → Complete business info

### 4.2 สร้าง Products
Dashboard → Products → Add product:

| Product | Price | ราคา |
|---|---|---|
| Maitri Starter | ฿1,490/month | recurring monthly |
| Maitri Standard | ฿2,990/month | recurring monthly |
| Maitri Pro | ฿5,990/month | recurring monthly |

Copy **Price ID** ของแต่ละ plan (`price_xxx`)

### 4.3 Webhook
Stripe → Developers → Webhooks → Add endpoint:
- URL: `https://yourdomain.com/api/billing/webhook`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
- Copy **Webhook signing secret** (`whsec_xxx`)

### 4.4 ENV vars
```env
STRIPE_SECRET_KEY=sk_live_xxx        # หรือ sk_test_ สำหรับ test mode
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_STANDARD=price_xxx
STRIPE_PRICE_PRO=price_xxx
```

### 4.5 Test mode
ใช้ `sk_test_` + `pk_test_` ก่อน production
Test card: `4242 4242 4242 4242` / any future date / any CVC

---

## 5. SendGrid (Email)

**ทำไมต้องมี:** ส่งอีเมลยืนยันการจอง, รีเซ็ตรหัสผ่าน, แจ้งเตือน

### 5.1 สมัคร
[sendgrid.com](https://sendgrid.com) → Free tier (100 emails/day)

### 5.2 ตั้งค่า Sender
Settings → Sender Authentication → Single Sender Verification
- Email: ใช้อีเมลที่ verify แล้ว เช่น `info@yourdomain.com`

### 5.3 API Key
Settings → API Keys → Create API Key → Full Access
```env
SENDGRID_API_KEY=SG.XXXXXXXXXX
SENDGRID_FROM_EMAIL=info@yourdomain.com
SENDGRID_FROM_NAME=ชื่อโรงแรม
```

---

## 6. Sentry (Error Monitoring)

**ทำไมต้องมี:** รู้ทันทีเมื่อมี error ใน production ไม่ต้องรอลูกค้าโทรบอก

### 6.1 สมัคร
[sentry.io](https://sentry.io) → Free tier (5,000 errors/month)

### 6.2 Create Project
New Project → Next.js → copy DSN

### 6.3 Install (ต้องทำก่อน deploy)
```bash
npm install @sentry/nextjs
```

### 6.4 ENV vars
```env
SENTRY_DSN=https://XXX@oXXX.ingest.sentry.io/XXX
NEXT_PUBLIC_SENTRY_DSN=https://XXX@oXXX.ingest.sentry.io/XXX
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=maitri-pms
```

---

## 7. LINE Messaging API

**ทำไมต้องมี:** แขก chat ผ่าน LINE → ระบบ AI ตอบ + staff เห็นใน Inbox

### 7.1 สมัคร LINE OA
1. [business.line.me](https://business.line.me) → สร้าง Official Account
2. ประเภท: **Hotel / Hospitality**

### 7.2 Messaging API Settings
LINE OA Manager → Settings → Messaging API → Enable
- Reply mode: **Webhook**
- Webhook URL: `https://yourdomain.com/api/webhooks/line`
- ✅ Use webhook: ON
- ✅ Allow bot to join groups: optional

### 7.3 Copy credentials
```env
LINE_CHANNEL_ACCESS_TOKEN=xxxxx (จาก Messaging API tab)
LINE_CHANNEL_SECRET=xxxxx (จาก Basic settings)
```

---

## 8. WhatsApp Business API (Optional)

**ขั้นตอนยาวกว่า LINE — ทำหลังถ้าต้องการ**

1. [developers.facebook.com](https://developers.facebook.com) → My Apps → Create App → Business
2. Add WhatsApp product
3. ต้องมี Facebook Business account verified
4. Webhook URL: `https://yourdomain.com/api/webhooks/whatsapp`
```env
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_VERIFY_TOKEN=xxx (สร้างเอง)
WHATSAPP_APP_SECRET=xxx
```

---

## 9. PWA Icons

```bash
# หลัง npm install
npm install --save-dev sharp
node scripts/generate-icons.mjs
git add public/icons/
git commit -m "Add PWA icons"
git push
```

---

## 10. OTA Channel Manager (Booking.com / Agoda)

### สำหรับโรงแรมใหม่ — แนะนำ Aggregator แทน Direct API:

**HotelRunner หรือ MyAllocator** — เชื่อม 200+ OTA ในคลิกเดียว
- Setup: 2-7 วัน (แทนที่จะรอ 4-12 สัปดาห์กับ Booking.com โดยตรง)
- ราคา: $30-50/เดือน

### สำหรับ Direct API (รอนานกว่า):
**Booking.com Extranet:**
1. ไป extranet.booking.com → ขอเข้า Connectivity Program
2. รอ approval 4-12 สัปดาห์
3. ได้ credentials → ใส่ใน System Settings → Channels

---

## 11. eTax / ทร.30 (Thailand-specific)

### eTax Invoice (INET):
1. สมัครที่ [inet.co.th/etax](https://inet.co.th) หรือ RD e-Tax ของกรมสรรพากร
2. ได้ Username/Password
```env
ETAX_USERNAME=xxx
ETAX_PASSWORD=xxx
```

### ทร.30 (Immigration):
1. ลงทะเบียนที่ [immigration.go.th](https://www.immigration.go.th)
2. ระบบใช้ข้อมูลจาก reservation form → submit อัตโนมัติทุก 24 ชม. (cron)

---

## 12. Production ENV vars สรุปทั้งหมด

Copy ไฟล์นี้ → เพิ่มใน Vercel Environment Variables:

```env
# ─── Core (Required) ──────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://XXXXX.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
CRON_SECRET=<openssl rand -hex 32>

# ─── AI ───────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-...

# ─── Email ────────────────────────────────────────────────────────
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=info@yourdomain.com
SENDGRID_FROM_NAME=Hotel Name

# ─── Payments ─────────────────────────────────────────────────────
OMISE_SECRET_KEY=skey_live_xxx
OMISE_PUBLIC_KEY=pkey_live_xxx
OMISE_WEBHOOK_SECRET=xxx

# ─── Subscription ─────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRICE_STARTER=price_xxx
STRIPE_PRICE_STANDARD=price_xxx
STRIPE_PRICE_PRO=price_xxx

# ─── Rate Limiting ────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# ─── Monitoring ───────────────────────────────────────────────────
SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/XXX
SENTRY_ORG=your-org
SENTRY_PROJECT=maitri-pms

# ─── LINE (Messaging) ─────────────────────────────────────────────
LINE_CHANNEL_ACCESS_TOKEN=xxx
LINE_CHANNEL_SECRET=xxx

# ─── WhatsApp (Optional) ──────────────────────────────────────────
WHATSAPP_ACCESS_TOKEN=xxx
WHATSAPP_PHONE_NUMBER_ID=xxx
WHATSAPP_VERIFY_TOKEN=xxx
WHATSAPP_APP_SECRET=xxx

# ─── Thai Compliance ──────────────────────────────────────────────
ETAX_USERNAME=xxx
ETAX_PASSWORD=xxx
IMMIGRATION_API_KEY=xxx

# ─── Accounting (Optional) ────────────────────────────────────────
FLOWACCOUNT_API_KEY=xxx
PEAK_API_KEY=xxx
```

---

## 13. Launch Checklist

```bash
# 1. ตรวจ ENV vars
npm run check:env

# 2. Type check
npm run type-check

# 3. Build
npm run build

# 4. Go-live check (ตรวจสอบ live keys)
npm run go-live:check
```

**Manual tests ก่อนเปิด:**
1. สมัครบัญชีโรงแรม → Onboarding flow
2. สร้างห้อง → สร้าง booking จาก /booking/[slug]
3. Guest portal → My Bookings → ยกเลิก
4. ส่ง LINE message → ตรวจ AI reply ใน Inbox
5. Stripe checkout → ตรวจ subscription status
6. ออก invoice → ตรวจ PDF
7. ตรวจ email ยืนยันการจอง

---

## 14. หลัง Launch

### ติดตามผล:
- Sentry → ดู errors realtime
- Vercel Analytics → ดู performance
- Supabase Dashboard → ดู DB usage
- Stripe Dashboard → ดู revenue + churns

### Scale เมื่อโตขึ้น:
- Supabase Pro ($25/mo) → connection pooling + more storage
- Vercel Pro ($20/mo) → edge functions + more bandwidth
- Upstash Pro → unlimited requests
