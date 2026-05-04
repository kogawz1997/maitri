<div align="center">

# Maitri

### Hotel Operating System for Thai Hospitality

AI-first property management — multi-language inbox, channel manager, ทร.30 + e-Tax compliance, all in one place.

[![Next.js](https://img.shields.io/badge/Next.js-15-000?logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

[Features](#-features) · [Quick Start](#-quick-start) · [Documentation](docs/) · [Roadmap](#-roadmap)

</div>

---

## ✨ Features

### Built for Phase 1 Launch

| | |
|--|--|
| 🌏 **AI Multi-Language Inbox** | LINE, WhatsApp, WeChat, Email — รวมในหน้าเดียว แปล + ปรับโทน 14 ภาษา |
| 🛏 **Reservation Management** | Calendar grid, drag-drop ready, check-in/out workflows |
| 🏨 **Channel Manager** | Booking.com, Agoda, Airbnb, Expedia + aggregator support |
| 💳 **PromptPay & Cards** | Omise integration, QR generation, refunds |
| 📋 **ทร.30 + e-Tax** | Auto-detect foreign guests, UBL XML, INET-ready |
| 🏢 **Multi-tenant** | Postgres RLS, ready for chain operations |
| 📊 **Reports & Analytics** | ADR, RevPAR, Occupancy, channel mix |
| 🌐 **Public Booking Engine** | Direct booking page, lower commission |
| 🤖 **Built with Claude AI** | Cultural-aware translation, smart reply suggestions |

### Phase 2 (Schema Ready, UI in Progress)

F&B POS · Spa Booking · Loyalty Program · Dynamic Pricing · Marketing Automation

---

## 🏗 Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  Guests                                   │
│   LINE · WhatsApp · WeChat · Email · Web · OTAs          │
└────────────┬─────────────────────────────────────────────┘
             │ Webhooks
┌────────────▼─────────────────────────────────────────────┐
│           Next.js 15 App (Vercel)                         │
│  ┌──────────┐  ┌───────────┐  ┌──────────────┐          │
│  │ Booking  │  │ Dashboard │  │  Webhooks    │          │
│  │ Engine   │  │ (Staff)   │  │  Endpoints   │          │
│  └──────────┘  └───────────┘  └──────────────┘          │
│       │              │                │                   │
│       ▼              ▼                ▼                   │
│  ┌────────┐   ┌────────────┐   ┌──────────┐            │
│  │   AI   │   │  Channel   │   │ Payment  │            │
│  │ Claude │   │  Adapters  │   │ (Omise)  │            │
│  └────────┘   └────────────┘   └──────────┘            │
└────────────────────┬─────────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────────┐
│         Supabase (Postgres + Auth + Realtime)             │
│  Reservations · Guests · Conversations · Inventory        │
│  + Row Level Security · Realtime subscriptions            │
└──────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/yourusername/maitri.git
cd maitri
npm install

# 2. Environment
cp .env.example .env.local
# Edit .env.local — see docs/SETUP.md for guidance

# 3. Database
npx supabase login
npx supabase link --project-ref YOUR_REF
npx supabase db push

# 4. Run
npm run dev
# → http://localhost:3000
```

**First time?** Read [docs/QUICK_START.md](docs/QUICK_START.md) — full 30-min setup guide.

---

## 📦 Tech Stack

**Frontend** — Next.js 15 (App Router) · React 18 · TypeScript · Tailwind CSS · Radix UI · Framer Motion · Recharts · Sonner

**Backend** — Next.js Route Handlers · Supabase (Postgres, Auth, Realtime, Storage)

**AI** — Anthropic Claude 3.5 Sonnet (translation, replies, dynamic pricing) · Haiku (sentiment)

**Channels** — LINE Messaging API · WhatsApp Business · SendGrid · WeChat (stub)

**Payments** — Omise (PromptPay, cards) · Stripe-ready

**Compliance** — UBL 2.0 e-Tax XML · ทร.30 Immigration

---

## 💸 Operating Costs

For 0–50 hotels:

| | Free Tier | Production |
|--|--|--|
| Vercel | $0 | $20/mo |
| Supabase | $0 | $25/mo |
| Anthropic API | $5 credit | $50–300/mo |
| Domain | — | $10/yr |
| **Total** | **$5** | **$95–345/mo** |

At 30 hotels × ฿5,500 ARPU = ฿165,000/mo (~$4,700) → **Gross margin ~93%**

---

## 🛣 Roadmap

### Phase 1 — Wedge Launch (Months 1–6)
- [x] Database schema (40+ tables)
- [x] Multi-language AI inbox
- [x] Reservation system
- [x] Channel adapters (stubs + LINE/WhatsApp full)
- [x] Public booking engine
- [x] ทร.30 + e-Tax pipelines
- [ ] LINE OA approved (production)
- [ ] HotelRunner channel manager live
- [ ] First 5 paying customers

### Phase 2 — Expand (Months 6–18)
- [ ] Direct OTA integrations (Booking.com, Agoda)
- [ ] F&B POS frontend
- [ ] Spa booking frontend
- [ ] Dynamic pricing AI
- [ ] Loyalty program with referrals
- [ ] Marketing automation

### Phase 3 — Scale (Year 2+)
- [ ] Multi-property chain support
- [ ] Mobile apps (React Native)
- [ ] WeChat Mini Program
- [ ] White-label option
- [ ] SEA expansion

---

## 📄 License

MIT © 2026 Maitri Hospitality Tech

---

<div align="center">

Built in Thailand 🇹🇭 with [Claude](https://claude.com)

</div>
