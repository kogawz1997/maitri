'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/top-bar';
import { cn } from '@/lib/utils';
import {
  CheckCircle2, XCircle, ExternalLink, ChevronDown, ChevronUp,
  Zap, CreditCard, Mail, Shield, MessageCircle, Bot, Wallet,
  Copy, Eye, EyeOff,
} from 'lucide-react';

interface Services {
  upstash: boolean; stripe: boolean; sendgrid: boolean;
  sentry: boolean; line: boolean; anthropic: boolean;
  omise: boolean; whatsapp: boolean;
}

const SERVICES = [
  {
    id: 'anthropic',
    name: 'Anthropic Claude AI',
    icon: Bot,
    color: 'from-orange-500 to-amber-500',
    priority: '🔴 จำเป็น',
    desc: 'AI ตอบแขก 14 ภาษา, แปลข้อความ, วิเคราะห์ sentiment',
    url: 'https://console.anthropic.com',
    envVars: ['ANTHROPIC_API_KEY'],
    steps: [
      { n: 1, title: 'สมัครบัญชี', desc: 'ไป console.anthropic.com → Sign up → Verify email' },
      { n: 2, title: 'เติมเครดิต', desc: 'Billing → Add credit card → เติมขั้นต่ำ $5 (ใช้ได้หลายพัน message)' },
      { n: 3, title: 'สร้าง API Key', desc: 'API Keys → Create Key → ตั้งชื่อ "Maitri Production" → Copy key' },
      { n: 4, title: 'ใส่ใน Vercel', desc: 'Vercel → Project → Settings → Environment Variables\n→ Name: ANTHROPIC_API_KEY\n→ Value: sk-ant-...\n→ Environment: Production, Preview, Development' },
      { n: 5, title: 'Redeploy', desc: 'Vercel → Deployments → Redeploy (หรือ git push)' },
    ],
    cost: '$5 เติมครั้งแรก · ~$0.003/1000 tokens · 1M tokens ≈ $3',
    note: 'Claude Haiku ใช้สำหรับ chatbot (ถูก) · Sonnet ใช้สำหรับ reply generation (แพงกว่า)',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid Email',
    icon: Mail,
    color: 'from-blue-500 to-indigo-500',
    priority: '🔴 จำเป็น',
    desc: 'ส่งอีเมลยืนยันการจอง, ยกเลิก, เตือนเช็คอิน, reset password',
    url: 'https://sendgrid.com',
    envVars: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL', 'SENDGRID_FROM_NAME'],
    steps: [
      { n: 1, title: 'สมัครบัญชี', desc: 'sendgrid.com → Start for Free → Free tier: 100 emails/วัน' },
      { n: 2, title: 'Verify Sender', desc: 'Settings → Sender Authentication → Single Sender Verification\n→ ใส่ email ที่ต้องการส่ง เช่น info@yourhotel.com\n→ ตรวจ inbox → คลิก verify link' },
      { n: 3, title: 'สร้าง API Key', desc: 'Settings → API Keys → Create API Key\n→ ชื่อ: "Maitri"\n→ Permission: Full Access\n→ Copy key (จะไม่แสดงอีก!)' },
      { n: 4, title: 'ใส่ใน Vercel', desc: 'SENDGRID_API_KEY=SG.xxx\nSENDGRID_FROM_EMAIL=info@yourhotel.com\nSENDGRID_FROM_NAME=ชื่อโรงแรม' },
    ],
    cost: 'ฟรี 100 email/วัน · Essentials plan $19.95/เดือน (สำหรับ 50,000+ email)',
    note: 'ถ้าส่ง email ไม่ถึง ตรวจ Spam folder และ Sender verification',
  },
  {
    id: 'upstash',
    name: 'Upstash Redis',
    icon: Zap,
    color: 'from-green-500 to-emerald-500',
    priority: '🟠 สำคัญ',
    desc: 'Rate limiting จริงบน Vercel serverless — ป้องกัน spam และ DDoS',
    url: 'https://upstash.com',
    envVars: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    steps: [
      { n: 1, title: 'สมัครบัญชี', desc: 'upstash.com → Sign up (GitHub หรือ email)' },
      { n: 2, title: 'สร้าง Database', desc: 'Create Database\n→ ชื่อ: maitri-rate-limit\n→ Type: Regional\n→ Region: ap-southeast-1 (Singapore)\n→ Click Create' },
      { n: 3, title: 'Copy credentials', desc: 'Database → REST API tab\n→ Copy UPSTASH_REDIS_REST_URL\n→ Copy UPSTASH_REDIS_REST_TOKEN' },
      { n: 4, title: 'ใส่ใน Vercel', desc: 'เพิ่มทั้ง 2 ค่าใน Environment Variables แล้ว Redeploy' },
    ],
    cost: 'ฟรี 10,000 requests/วัน · Pay-as-you-go $0.2/100k requests',
    note: 'ถ้าไม่ตั้งค่า rate limit ยังทำงานได้แต่ใช้ in-memory (reset ทุก cold start)',
  },
  {
    id: 'stripe',
    name: 'Stripe Billing',
    icon: CreditCard,
    color: 'from-violet-500 to-purple-500',
    priority: '🟠 สำคัญ',
    desc: 'เก็บเงิน subscription จากโรงแรมที่ใช้ Maitri PMS (Starter/Standard/Pro)',
    url: 'https://stripe.com',
    envVars: ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY', 'STRIPE_WEBHOOK_SECRET', 'STRIPE_PRICE_STARTER', 'STRIPE_PRICE_STANDARD', 'STRIPE_PRICE_PRO'],
    steps: [
      { n: 1, title: 'สมัคร + verify บัญชีธุรกิจ', desc: 'stripe.com → Create account\n→ กรอกข้อมูลบริษัท ที่อยู่ เลขบัญชีธนาคาร\n→ ใช้เวลา verify 1-3 วัน' },
      { n: 2, title: 'สร้าง Products', desc: 'Products → Add product (ทำ 3 ครั้ง):\n\n• Maitri Starter — ฿1,490/เดือน\n• Maitri Standard — ฿2,990/เดือน\n• Maitri Pro — ฿5,990/เดือน\n\nแต่ละ product: คลิก Add price → Recurring → Monthly\nCopy Price ID (price_xxx) ของแต่ละ plan' },
      { n: 3, title: 'Copy API Keys', desc: 'Developers → API Keys\n→ Copy Publishable key (pk_live_xxx)\n→ Reveal Secret key → Copy (sk_live_xxx)' },
      { n: 4, title: 'ตั้ง Webhook', desc: 'Developers → Webhooks → Add endpoint\n→ URL: https://yourdomain.com/api/billing/webhook\n→ Events ที่เลือก:\n  ✅ checkout.session.completed\n  ✅ customer.subscription.updated\n  ✅ customer.subscription.deleted\n  ✅ invoice.payment_failed\n  ✅ invoice.payment_succeeded\n→ Copy Signing secret (whsec_xxx)' },
      { n: 5, title: 'ใส่ใน Vercel', desc: 'STRIPE_SECRET_KEY=sk_live_xxx\nSTRIPE_PUBLISHABLE_KEY=pk_live_xxx\nSTRIPE_WEBHOOK_SECRET=whsec_xxx\nSTRIPE_PRICE_STARTER=price_xxx\nSTRIPE_PRICE_STANDARD=price_xxx\nSTRIPE_PRICE_PRO=price_xxx' },
      { n: 6, title: 'ทดสอบ', desc: 'ใช้ Test mode ก่อน: sk_test_ + pk_test_\nTest card: 4242 4242 4242 4242 · any date · any CVC\nตรวจ webhook logs ใน Stripe Dashboard' },
    ],
    cost: '2.9% + ฿11 ต่อรายการ (standard Thai rate)',
    note: 'สำหรับ THB ต้องใช้ account ที่ verify ในประเทศไทย หรือใช้ Omise แทนสำหรับ local payments',
  },
  {
    id: 'omise',
    name: 'Omise (Guest Payment)',
    icon: Wallet,
    color: 'from-sky-500 to-blue-500',
    priority: '🟠 สำคัญ',
    desc: 'รับชำระเงินจากแขกที่จองห้อง — PromptPay, บัตรเครดิต, QR Code',
    url: 'https://omise.co',
    envVars: ['OMISE_SECRET_KEY', 'OMISE_PUBLIC_KEY', 'OMISE_WEBHOOK_SECRET'],
    steps: [
      { n: 1, title: 'สมัคร + KYC', desc: 'omise.co → Sign up\n→ กรอกข้อมูลธุรกิจ\n→ อัพโหลด: ใบทะเบียนพาณิชย์/ภพ.20, สำเนาบัตรประชาชนผู้มีอำนาจ\n→ รอ approval 2-5 วันทำการ' },
      { n: 2, title: 'Copy Keys', desc: 'Dashboard → Keys\n→ Copy Public Key (pkey_xxx)\n→ Copy Secret Key (skey_xxx)\n→ ใช้ test keys (pkey_test_, skey_test_) ก่อน production' },
      { n: 3, title: 'ตั้ง Webhook', desc: 'Dashboard → Webhooks → Create webhook\n→ URL: https://yourdomain.com/api/webhooks/omise\n→ เลือก events: charge.complete, charge.fail\n→ Copy webhook secret' },
      { n: 4, title: 'ใส่ใน Vercel', desc: 'OMISE_SECRET_KEY=skey_live_xxx\nOMISE_PUBLIC_KEY=pkey_live_xxx\nOMISE_WEBHOOK_SECRET=xxx' },
      { n: 5, title: 'ทดสอบ PromptPay', desc: 'ลองจองห้อง → เลือกชำระเงิน → เลือก PromptPay\nจะได้ QR code → scan ด้วย mobile banking\nตรวจ status ใน Omise Dashboard' },
    ],
    cost: '3% ต่อรายการ (บัตรเครดิต) · 1.5% (PromptPay) · ไม่มีค่ารายเดือน',
    note: 'Omise รองรับ THB โดยตรง เหมาะสำหรับโรงแรมในไทยมากกว่า Stripe',
  },
  {
    id: 'line',
    name: 'LINE Messaging API',
    icon: MessageCircle,
    color: 'from-green-400 to-green-600',
    priority: '🟡 แนะนำ',
    desc: 'แขก chat ผ่าน LINE OA → AI ตอบอัตโนมัติ → staff เห็นใน Inbox',
    url: 'https://developers.line.biz',
    envVars: ['LINE_CHANNEL_ACCESS_TOKEN', 'LINE_CHANNEL_SECRET'],
    steps: [
      { n: 1, title: 'สร้าง LINE Official Account', desc: 'business.line.me → สร้าง Official Account\n→ เลือกประเภท: Hotel / Accommodation\n→ ตั้งชื่อ: ชื่อโรงแรม\n→ ยืนยันตัวตน (ถ้าต้องการ verified badge)' },
      { n: 2, title: 'สร้าง Messaging API Channel', desc: 'LINE OA Manager → Settings → Messaging API\n→ Enable Messaging API\n→ ตั้งค่า provider name\n→ จะได้ Channel ID + Secret' },
      { n: 3, title: 'ตั้ง Webhook', desc: 'LINE Developers Console → Channels → ชื่อ channel\n→ Messaging API tab\n→ Webhook URL: https://yourdomain.com/api/webhooks/line\n→ ✅ Use webhook: ON\n→ ✅ Auto-reply: OFF (ใช้ AI แทน)\n→ Click Verify' },
      { n: 4, title: 'Copy Credentials', desc: 'Messaging API tab:\n→ Channel access token → Issue → Copy\n→ Basic settings tab:\n→ Channel secret → Copy' },
      { n: 5, title: 'ใส่ใน Vercel', desc: 'LINE_CHANNEL_ACCESS_TOKEN=xxx\nLINE_CHANNEL_SECRET=xxx' },
    ],
    cost: 'ฟรีสำหรับ 500 messages/เดือน · Light plan ฿1,500/เดือน (15,000 msg)',
    note: 'ต้องมี LINE OA ก่อน — แขกต้อง Follow OA ก่อนจึงจะส่งข้อความได้',
  },
  {
    id: 'sentry',
    name: 'Sentry Error Monitoring',
    icon: Shield,
    color: 'from-red-500 to-rose-500',
    priority: '🟡 แนะนำ',
    desc: 'รู้ทันทีเมื่อมี error ใน production — stack trace, user context, alerts',
    url: 'https://sentry.io',
    envVars: ['SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN', 'SENTRY_ORG', 'SENTRY_PROJECT'],
    steps: [
      { n: 1, title: 'สมัคร', desc: 'sentry.io → Sign up (GitHub แนะนำ)\n→ Free tier: 5,000 errors/เดือน' },
      { n: 2, title: 'สร้าง Project', desc: 'Projects → Create Project\n→ Platform: Next.js\n→ Alert frequency: On every new issue\n→ ชื่อ: maitri-pms' },
      { n: 3, title: 'Install SDK', desc: 'ใน terminal ของ project:\nnpm install @sentry/nextjs\n\n(sentry.*.config.ts มีอยู่แล้วในโปรเจคนี้ — พร้อมใช้ทันที)' },
      { n: 4, title: 'Copy DSN', desc: 'Project → Settings → Client Keys (DSN)\n→ Copy DSN URL (https://xxx@oXXX.ingest.sentry.io/xxx)\n\nหา org slug: Settings → Organization → Organization Slug' },
      { n: 5, title: 'ใส่ใน Vercel', desc: 'SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/xxx\nNEXT_PUBLIC_SENTRY_DSN=https://xxx@oXXX.ingest.sentry.io/xxx\nSENTRY_ORG=your-org-slug\nSENTRY_PROJECT=maitri-pms' },
      { n: 6, title: 'ทดสอบ', desc: 'หลัง deploy → ไป Sentry Dashboard\n→ ควรเห็น events เริ่มมา\n→ ทดสอบ: เปิดหน้าที่ไม่มี (404) → ตรวจ Issues' },
    ],
    cost: 'ฟรี 5,000 errors/เดือน · Team plan $26/เดือน (100k errors)',
    note: 'ตั้งค่า Alert rules → ส่ง email เมื่อ error ใหม่เกิดขึ้น',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business API',
    icon: MessageCircle,
    color: 'from-emerald-500 to-teal-500',
    priority: '🟢 Optional',
    desc: 'รับ-ส่งข้อความ WhatsApp — สำหรับแขกต่างชาติที่ใช้ WhatsApp',
    url: 'https://business.facebook.com',
    envVars: ['WHATSAPP_ACCESS_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID', 'WHATSAPP_VERIFY_TOKEN', 'WHATSAPP_APP_SECRET'],
    steps: [
      { n: 1, title: 'Facebook Business Account', desc: 'business.facebook.com\n→ ต้องมี Facebook Business account\n→ Verify ธุรกิจ (อาจต้องใช้เอกสาร)' },
      { n: 2, title: 'สร้าง Meta App', desc: 'developers.facebook.com → My Apps → Create App\n→ ประเภท: Business\n→ ชื่อ: Maitri Hotel' },
      { n: 3, title: 'เพิ่ม WhatsApp Product', desc: 'App Dashboard → Add Product → WhatsApp → Set up\n→ เพิ่ม WhatsApp Business Account\n→ เพิ่มเบอร์โทร (ใช้เบอร์ที่ยังไม่มี WhatsApp)' },
      { n: 4, title: 'ตั้ง Webhook', desc: 'WhatsApp → Configuration → Webhook\n→ URL: https://yourdomain.com/api/webhooks/whatsapp\n→ Verify token: สร้างเองอะไรก็ได้ เช่น "maitri-verify-2025"\n→ Subscribe: messages' },
      { n: 5, title: 'Copy Credentials', desc: 'App Dashboard → WhatsApp → API Setup\n→ Temporary access token (หรือสร้าง permanent)\n→ Phone number ID\n→ App Secret: App Settings → Basic → App Secret' },
      { n: 6, title: 'ใส่ใน Vercel', desc: 'WHATSAPP_ACCESS_TOKEN=xxx\nWHATSAPP_PHONE_NUMBER_ID=xxx\nWHATSAPP_VERIFY_TOKEN=maitri-verify-2025\nWHATSAPP_APP_SECRET=xxx' },
    ],
    cost: 'ฟรี 1,000 conversations/เดือน · $0.0492/conversation หลังจากนั้น',
    note: 'WhatsApp ใช้เวลา verify นาน — ทำหลัง LINE ถ้ายังไม่มีผู้ใช้ต่างชาติมาก',
  },
];

export function SetupClient({ services }: { services: Services }) {
  const [expanded, setExpanded] = useState<string | null>('anthropic');
  const [copied, setCopied] = useState<string | null>(null);

  const doneCount = Object.values(services).filter(Boolean).length;
  const total = Object.keys(services).length;

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  const getStatus = (id: string) => (services as any)[id];

  return (
    <div className="container max-w-3xl py-8 animate-fade-in">
      <TopBar
        title="Service Setup"
        description="ตั้งค่า external services เพื่อ production"
      />

      {/* Progress */}
      <div className="bg-card border border-border rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <span className="font-medium text-sm">{doneCount}/{total} services configured</span>
          <span className={`text-sm font-medium ${doneCount === total ? 'text-emerald-600' : 'text-amber-600'}`}>
            {doneCount === total ? '✅ พร้อม production' : `⚠️ ยังขาด ${total - doneCount} services`}
          </span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${(doneCount/total)*100}%` }} />
        </div>
      </div>

      {/* Service cards */}
      <div className="space-y-3">
        {SERVICES.map(svc => {
          const Icon = svc.icon;
          const isConfigured = getStatus(svc.id);
          const isOpen = expanded === svc.id;

          return (
            <div key={svc.id} className={cn('border rounded-2xl overflow-hidden transition-all', isConfigured ? 'border-emerald-200 dark:border-emerald-800' : 'border-border')}>
              {/* Header */}
              <button className="w-full flex items-center gap-4 p-5 text-left hover:bg-secondary/30 transition-colors"
                onClick={() => setExpanded(isOpen ? null : svc.id)}>
                <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${svc.color} flex items-center justify-center shrink-0`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{svc.name}</span>
                    <span className="text-2xs">{svc.priority}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{svc.desc}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isConfigured
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    : <XCircle className="h-5 w-5 text-muted-foreground/30" />
                  }
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="border-t border-border p-5 space-y-5 bg-secondary/20">
                  {/* Status */}
                  <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl text-sm', isConfigured ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300' : 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300')}>
                    {isConfigured ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                    {isConfigured ? 'ตั้งค่าแล้ว — ENV vars พบในระบบ' : 'ยังไม่ได้ตั้งค่า — ทำตามขั้นตอนด้านล่าง'}
                  </div>

                  {/* ENV vars needed */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">ENV vars ที่ต้องเพิ่มใน Vercel</p>
                    <div className="space-y-1.5">
                      {svc.envVars.map(v => (
                        <div key={v} className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2">
                          <code className="text-xs flex-1 font-mono text-accent">{v}</code>
                          <button onClick={() => copy(v, v)} className="shrink-0 p-1 hover:bg-secondary rounded transition-colors">
                            {copied === v ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Steps */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">ขั้นตอนการตั้งค่า</p>
                    <div className="space-y-3">
                      {svc.steps.map(step => (
                        <div key={step.n} className="flex gap-3">
                          <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                            {step.n}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-0.5">{step.title}</p>
                            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Cost + Note */}
                  <div className="grid grid-cols-1 gap-3">
                    <div className="p-3 bg-card border border-border rounded-xl">
                      <p className="text-2xs text-muted-foreground uppercase tracking-wider mb-1">ค่าใช้จ่าย</p>
                      <p className="text-xs">{svc.cost}</p>
                    </div>
                    {svc.note && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                        <p className="text-xs text-amber-700 dark:text-amber-300">💡 {svc.note}</p>
                      </div>
                    )}
                  </div>

                  {/* Link to docs */}
                  <a href={svc.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 border border-border rounded-xl text-sm text-muted-foreground hover:bg-secondary transition-colors">
                    <ExternalLink className="h-4 w-4" />
                    เปิด {svc.name} Dashboard
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom checklist */}
      <div className="mt-8 p-5 bg-card border border-border rounded-2xl">
        <h3 className="font-semibold mb-4 text-sm">Checklist ก่อน Go-Live</h3>
        <div className="space-y-2 text-sm">
          {[
            ['Supabase migrations รัน', 'npm run supabase:push หรือ supabase db push'],
            ['Email verification เปิดใน Supabase', 'Dashboard → Auth → Email → Enable confirmations'],
            ['Storage bucket สร้างแล้ว', 'Supabase → Storage → hotel-assets (public)'],
            ['PWA icons generate', 'npm install sharp && node scripts/generate-icons.mjs'],
            ['npm install @sentry/nextjs', 'ถ้าจะใช้ Sentry'],
            ['npm run check:env ผ่าน', 'ตรวจ ENV vars ครบ'],
            ['npm run build ผ่าน', 'ไม่มี TypeScript error'],
            ['npm run go-live:check ผ่าน', 'ตรวจ live keys'],
            ['ทดสอบ booking flow จริง', 'จองห้อง → ได้ email → portal → ยกเลิก'],
            ['ทดสอบ Stripe payment', 'ใช้ test card 4242424242424242'],
          ].map(([task, hint]) => (
            <label key={task} className="flex items-start gap-3 cursor-pointer group">
              <input type="checkbox" className="mt-0.5 rounded accent-accent" />
              <div>
                <p className="font-medium group-has-[:checked]:line-through group-has-[:checked]:text-muted-foreground">{task}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
