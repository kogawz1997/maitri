import Link from 'next/link';
import { ArrowRight, Sparkles, Globe2, Layers, ShieldCheck, Zap, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Logo />
            <span className="font-display text-xl font-medium tracking-tight">Maitri</span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">ฟีเจอร์</a>
            <a href="#how" className="hover:text-foreground transition-colors">การทำงาน</a>
            <a href="#pricing" className="hover:text-foreground transition-colors">ราคา</a>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">เข้าสู่ระบบ</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">เริ่มต้นฟรี</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-accent/10 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-primary-200/20 blur-3xl" />
        </div>

        <div className="container py-24 md:py-32 lg:py-40">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground animate-fade-in">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              เปิดให้ทดลองใช้แล้ว — ฟรี 60 วัน
            </div>

            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-medium tracking-tight text-balance animate-fade-in delay-100 leading-[0.95]">
              ระบบโรงแรม<br/>
              <span className="italic text-accent">ที่เข้าใจ</span> แขกของคุณ
            </h1>

            <p className="mx-auto mt-8 max-w-2xl text-lg text-muted-foreground text-balance animate-fade-in delay-200 leading-relaxed">
              AI Concierge คุยกับแขกได้ 14 ภาษา ระบบจอง ห้อง บัญชี OTA ครบในที่เดียว
              ออกแบบเฉพาะตลาดไทย พร้อม ทร.30 และ e-Tax
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in delay-300">
              <Link href="/auth/signup">
                <Button size="lg" className="group">
                  ทดลองใช้ฟรี
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline">ดูฟีเจอร์ทั้งหมด</Button>
              </Link>
            </div>

            <p className="mt-6 text-xs text-muted-foreground animate-fade-in delay-400">
              ไม่ต้องใช้บัตรเครดิต · ตั้งค่าใน 30 นาที · ยกเลิกได้ตลอด
            </p>
          </div>

          {/* Hero visual - mock dashboard */}
          <div className="mt-20 relative animate-fade-in delay-500">
            <div className="absolute -inset-x-20 -top-8 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            <div className="mx-auto max-w-5xl">
              <div className="relative rounded-2xl border bg-card p-2 shadow-2xl">
                <div className="rounded-xl overflow-hidden">
                  <MockDashboard />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-secondary/30">
        <div className="container py-8">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground mb-6">
            ออกแบบสำหรับ
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4 text-sm text-muted-foreground">
            <span>โรงแรม Boutique</span>
            <span className="text-border">·</span>
            <span>Pool Villa</span>
            <span className="text-border">·</span>
            <span>Hostel</span>
            <span className="text-border">·</span>
            <span>Resort ขนาดกลาง</span>
            <span className="text-border">·</span>
            <span>Serviced Apartment</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-xs uppercase tracking-widest text-accent mb-3">Features</p>
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-balance">
            ทุกอย่างที่โรงแรมต้องการ ในที่เดียว
          </h2>
          <p className="mt-4 text-muted-foreground text-pretty">
            ไม่ต้องใช้หลาย software ไม่ต้อง copy-paste ระหว่างระบบ
            ทุกอย่างเชื่อมกัน รวมข้อมูล ทำให้คุณตัดสินใจได้ดีขึ้น
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-border rounded-2xl overflow-hidden border">
          <FeatureCard
            icon={MessageSquareText}
            title="AI Multi-language Inbox"
            description="LINE, WhatsApp, WeChat, Email รวมในหน้าเดียว AI แปล + ตอบ 14 ภาษา ปรับโทนตามวัฒนธรรม"
            badge="Phase 1"
          />
          <FeatureCard
            icon={Layers}
            title="Channel Manager"
            description="Sync ราคาและห้องว่างกับ Booking.com, Agoda, Airbnb แบบ real-time ป้องกัน overbook"
            badge="Phase 1"
          />
          <FeatureCard
            icon={Globe2}
            title="Booking Engine"
            description="หน้าจองตรงพร้อม ลด commission OTA แสดงห้องและราคา dynamic"
            badge="Phase 1"
          />
          <FeatureCard
            icon={ShieldCheck}
            title="ทร.30 + e-Tax"
            description="แจ้งชาวต่างชาติ ออกใบกำกับภาษีอิเล็กทรอนิกส์ เชื่อมกรมสรรพากร"
            badge="Compliance"
          />
          <FeatureCard
            icon={Sparkles}
            title="Dynamic Pricing AI"
            description="ปรับราคาอัตโนมัติตาม demand, competitor, events เพิ่ม RevPAR 15-30%"
            badge="Phase 2"
          />
          <FeatureCard
            icon={Zap}
            title="Smart Operations"
            description="งานแม่บ้าน, ช่าง, F&B, Spa, Loyalty Program ทำงานเป็นทีมเดียว"
            badge="Phase 2"
          />
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-border bg-secondary/30">
        <div className="container py-24 md:py-32">
          <div className="mx-auto max-w-2xl text-center mb-16">
            <p className="text-xs uppercase tracking-widest text-accent mb-3">How it works</p>
            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight">
              เริ่มใช้ใน 30 นาที
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Step number="01" title="สมัครและตั้งค่าโรงแรม" description="กรอกข้อมูลโรงแรม เพิ่มประเภทห้องและห้อง พร้อมราคา ใช้เวลา 10-15 นาที" />
            <Step number="02" title="เชื่อมต่อช่องทางสื่อสาร" description="LINE OA, WhatsApp, Email — ทำตามคู่มือทีละขั้นตอน 10 นาที" />
            <Step number="03" title="เริ่มรับการจองและคุยแขก" description="ทดสอบจองห้อง คุยกับแขกผ่าน inbox ดูระบบทำงาน" />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-24 md:py-32">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <p className="text-xs uppercase tracking-widest text-accent mb-3">Pricing</p>
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight">
            ราคาตรงไปตรงมา
          </h2>
          <p className="mt-4 text-muted-foreground">
            ไม่มีค่า setup ไม่มี hidden fees ยกเลิกได้ทุกเมื่อ
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <PricingCard
            name="Starter"
            price="1,500"
            description="เหมาะกับโรงแรมขนาดเล็ก 5-15 ห้อง"
            features={[
              'AI Inbox (LINE + Email)',
              '1 OTA channel',
              'จัดการห้องและจอง',
              'ออก e-Tax invoice',
              'รายงานพื้นฐาน',
              '1 ผู้ใช้',
            ]}
          />
          <PricingCard
            name="Standard"
            price="3,500"
            description="ยอดนิยม สำหรับ 15-50 ห้อง"
            features={[
              'ทุกอย่างใน Starter',
              'WhatsApp + WeChat',
              'OTA ไม่จำกัด',
              'Channel Manager',
              'Dynamic pricing AI',
              '5 ผู้ใช้',
              'ทร.30 อัตโนมัติ',
            ]}
            highlighted
          />
          <PricingCard
            name="Pro"
            price="8,000"
            description="โรงแรม 50+ ห้องและ chain"
            features={[
              'ทุกอย่างใน Standard',
              'F&B + Spa POS',
              'Loyalty Program',
              'API access',
              'Multi-property',
              'ผู้ใช้ไม่จำกัด',
              'Priority support',
            ]}
          />
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24 md:py-32">
        <div className="relative overflow-hidden rounded-3xl bg-primary text-primary-foreground p-12 md:p-20 text-center">
          <div className="absolute inset-0 opacity-10 bg-grain mix-blend-overlay" />
          <div className="relative">
            <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight text-balance">
              พร้อมเปลี่ยนวิธีจัดการโรงแรมแล้วใช่มั้ย
            </h2>
            <p className="mt-4 text-primary-foreground/70 text-pretty max-w-xl mx-auto">
              ทดลองฟรี 60 วัน เห็นผลทันที ไม่ต้องผูกมัด
            </p>
            <div className="mt-8">
              <Link href="/auth/signup">
                <Button size="lg" variant="accent" className="group">
                  เริ่มต้นฟรี
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="container py-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="font-display text-lg font-medium">Maitri</span>
            </div>
            <p className="text-xs text-muted-foreground">
              © 2026 Maitri Hospitality Tech · Made in Thailand 🇹🇭
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
        <path
          d="M4 20V4h4l4 8 4-8h4v16h-3V9l-3 6h-4L7 9v11H4z"
          fill="currentColor"
        />
      </svg>
    </div>
  );
}

function FeatureCard({
  icon: Icon, title, description, badge,
}: { icon: any; title: string; description: string; badge?: string }) {
  return (
    <div className="group relative bg-card p-8 hover:bg-secondary/30 transition-colors">
      <div className="flex items-start justify-between mb-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary group-hover:bg-accent group-hover:text-accent-foreground transition-colors">
          <Icon className="h-5 w-5" />
        </div>
        {badge && (
          <span className="text-2xs uppercase tracking-wider text-muted-foreground">{badge}</span>
        )}
      </div>
      <h3 className="font-display text-xl font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{description}</p>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div>
      <div className="font-display text-5xl font-medium text-accent mb-3">{number}</div>
      <h3 className="font-display text-xl font-medium mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground text-pretty leading-relaxed">{description}</p>
    </div>
  );
}

function PricingCard({
  name, price, description, features, highlighted,
}: {
  name: string; price: string; description: string; features: string[]; highlighted?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-8 ${
        highlighted
          ? 'border-accent bg-accent/5 shadow-xl shadow-accent/10 scale-105'
          : 'border-border bg-card'
      }`}
    >
      {highlighted && (
        <div className="inline-block mb-4 text-2xs uppercase tracking-wider text-accent font-medium">
          ⭐ Most popular
        </div>
      )}
      <h3 className="font-display text-2xl font-medium">{name}</h3>
      <p className="text-sm text-muted-foreground mt-1">{description}</p>
      <div className="mt-6 mb-6">
        <span className="font-display text-5xl font-medium ticker">฿{price}</span>
        <span className="text-muted-foreground text-sm ml-1">/เดือน</span>
      </div>
      <ul className="space-y-2.5 mb-8">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <svg className="h-4 w-4 mt-0.5 text-accent shrink-0" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/auth/signup">
        <Button variant={highlighted ? 'accent' : 'outline'} className="w-full">
          เริ่มใช้
        </Button>
      </Link>
    </div>
  );
}

function MockDashboard() {
  return (
    <div className="bg-background border-t border-border">
      <div className="grid grid-cols-[200px_1fr]">
        {/* Sidebar */}
        <div className="border-r border-border bg-secondary/30 p-3 space-y-1 hidden md:block">
          {['ภาพรวม', 'Inbox', 'การจอง', 'ห้อง', 'แขก', 'รายงาน'].map((item, i) => (
            <div
              key={item}
              className={`px-3 py-1.5 rounded-md text-xs ${
                i === 1 ? 'bg-card text-foreground font-medium' : 'text-muted-foreground'
              }`}
            >
              {item}
            </div>
          ))}
        </div>

        {/* Inbox preview */}
        <div className="grid grid-cols-[240px_1fr]">
          {/* Conversation list */}
          <div className="border-r border-border">
            <div className="p-3 border-b border-border">
              <div className="text-xs font-medium">Inbox · 3</div>
            </div>
            <ConversationItem name="田中 美咲" channel="LINE" preview="チェックイン時間は何時..." active />
            <ConversationItem name="Sarah Mitchell" channel="WhatsApp" preview="Is breakfast included?" />
            <ConversationItem name="李伟" channel="WeChat" preview="可以晚一点退房吗？" />
          </div>

          {/* Active conversation */}
          <div className="p-4 space-y-3 bg-secondary/10">
            <div className="flex justify-end">
              <div className="bg-card border max-w-[80%] rounded-2xl rounded-tr-sm px-3 py-2 text-xs">
                <div className="text-muted-foreground mb-0.5">チェックインは何時からですか？</div>
                <div className="text-foreground/60">เช็คอินกี่โมงคะ?</div>
              </div>
            </div>
            <div className="flex">
              <div className="bg-primary text-primary-foreground max-w-[80%] rounded-2xl rounded-tl-sm px-3 py-2 text-xs">
                <div className="flex items-center gap-1 text-primary-foreground/60 mb-0.5">
                  <Sparkles className="h-2.5 w-2.5" /> AI suggested
                </div>
                <div>14:00からチェックインいただけます</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConversationItem({ name, channel, preview, active }: any) {
  const colors: any = {
    LINE: 'bg-emerald-100 text-emerald-700',
    WhatsApp: 'bg-emerald-100 text-emerald-700',
    WeChat: 'bg-emerald-100 text-emerald-700',
  };
  return (
    <div className={`p-3 border-b border-border ${active ? 'bg-card' : ''}`}>
      <div className="flex justify-between items-start mb-1">
        <div className="text-xs font-medium truncate">{name}</div>
        <span className={`text-[10px] px-1.5 py-px rounded ${colors[channel]}`}>{channel}</span>
      </div>
      <p className="text-xs text-muted-foreground truncate">{preview}</p>
    </div>
  );
}
