'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, ExternalLink, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const STEPS = [
  { id: 1, title: 'สร้าง LINE OA', desc: 'สร้าง Official Account ใน LINE Business' },
  { id: 2, title: 'สร้าง Messaging API', desc: 'เปิดใช้งาน Messaging API channel' },
  { id: 3, title: 'ใส่ Credentials', desc: 'กรอก Channel ID และ Secret' },
  { id: 4, title: 'ตั้งค่า Webhook', desc: 'เชื่อมต่อ LINE กับ Maitri' },
  { id: 5, title: 'ทดสอบ', desc: 'ยืนยันการเชื่อมต่อ' },
];

export default function LineSetupPage() {
  const [step, setStep]       = useState(1);
  const [form, setForm]       = useState({ channelId: '', channelSecret: '', accessToken: '' });
  const [saving, setSaving]   = useState(false);
  const [testing, setTesting] = useState(false);
  const [testOk, setTestOk]   = useState<boolean | null>(null);

  const appUrl    = typeof window !== 'undefined' ? window.location.origin : 'https://yourdomain.com';
  const webhookUrl = `${appUrl}/api/webhooks/line`;

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('คัดลอกแล้ว!');
  }

  async function saveCredentials() {
    if (!form.channelSecret || !form.accessToken) { toast.error('กรุณากรอกข้อมูลให้ครบ'); return; }
    setSaving(true);
    const res = await fetch('/api/channels/line/connect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) { toast.success('บันทึกแล้ว'); setStep(4); }
    else toast.error('บันทึกไม่สำเร็จ');
  }

  async function testConnection() {
    setTesting(true);
    const res = await fetch('/api/channels/line/test');
    setTesting(false);
    const ok = res.ok;
    setTestOk(ok);
    if (ok) toast.success('เชื่อมต่อสำเร็จ! ✅');
    else toast.error('เชื่อมต่อไม่สำเร็จ ตรวจสอบ credentials อีกครั้ง');
  }

  return (
    <div className="container max-w-2xl py-8">
      <Link href="/dashboard/channels" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> กลับ
      </Link>

      <h1 className="text-xl font-bold mb-2">เชื่อมต่อ LINE Official Account</h1>
      <p className="text-sm text-muted-foreground mb-8">รับและตอบข้อความจากลูกค้าผ่าน LINE ใน AI Inbox</p>

      {/* Stepper */}
      <div className="flex items-center mb-10 gap-0">
        {STEPS.map((s, i) => (
          <div key={s.id} className="flex items-center flex-1">
            <button onClick={() => s.id < step && setStep(s.id)}
              className={cn('flex flex-col items-center', s.id < step && 'cursor-pointer')}>
              <div className={cn('h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all',
                s.id < step  ? 'bg-[#2A2522] border-[#2A2522] text-white' :
                s.id === step ? 'bg-[#C66A30] border-[#C66A30] text-white' :
                                'bg-white border-black/15 text-[#2A2522]/30')}>
                {s.id < step ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              <span className={cn('text-2xs mt-1 hidden sm:block text-center', s.id === step ? 'text-[#C66A30] font-medium' : 'text-[#2A2522]/40')}>
                {s.title}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-0.5 mx-2 -mt-5 sm:-mt-6 transition-colors', s.id < step ? 'bg-[#2A2522]' : 'bg-black/10')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white rounded-2xl border border-black/8 p-6">
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">1. สร้าง LINE Official Account</h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>ไปที่ <a href="https://manager.line.biz" target="_blank" className="text-[#C66A30] hover:underline inline-flex items-center gap-1">LINE Business Manager <ExternalLink className="h-3 w-3" /></a></li>
              <li>เลือก "สร้าง LINE Official Account ใหม่"</li>
              <li>กรอกชื่อโรงแรมและอีเมล</li>
              <li>เลือกประเภท: <strong>Hotel / Accommodation</strong></li>
              <li>ยืนยันและสร้างบัญชี</li>
            </ol>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-sm text-sky-800">
              💡 ถ้ามี LINE OA อยู่แล้ว ข้ามขั้นตอนนี้ได้เลย
            </div>
            <button onClick={() => setStep(2)} className="w-full py-3 bg-[#06C755] text-white rounded-xl font-semibold flex items-center justify-center gap-2">
              ถัดไป <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">2. เปิด Messaging API</h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>ใน LINE OA Manager → ไปที่ <strong>Settings → Messaging API</strong></li>
              <li>กด <strong>"Enable Messaging API"</strong></li>
              <li>เลือก Provider หรือสร้างใหม่</li>
              <li>ยืนยัน → ระบบจะสร้าง <strong>Channel ID</strong> และ <strong>Channel Secret</strong></li>
              <li>ไปที่ LINE Developers Console → สร้าง <strong>Long-lived Access Token</strong></li>
            </ol>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 border border-black/10 rounded-xl text-sm font-medium">ย้อนกลับ</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 bg-[#06C755] text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                ถัดไป <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">3. ใส่ Credentials</h2>
            {[
              { k: 'channelId', l: 'Channel ID', ph: '1234567890' },
              { k: 'channelSecret', l: 'Channel Secret', ph: 'abc123...', type: 'password' },
              { k: 'accessToken', l: 'Channel Access Token', ph: 'eyJ...', type: 'password' },
            ].map(({ k, l, ph, type }) => (
              <div key={k}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">{l}</label>
                <input type={type || 'text'} value={(form as any)[k]}
                  onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  placeholder={ph}
                  className="w-full px-4 py-2.5 bg-secondary border-0 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
            ))}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 py-3 border border-black/10 rounded-xl text-sm font-medium">ย้อนกลับ</button>
              <button onClick={saveCredentials} disabled={saving}
                className="flex-1 py-3 bg-[#06C755] text-white rounded-xl font-semibold disabled:opacity-50">
                {saving ? 'กำลังบันทึก...' : 'บันทึก'}
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-bold text-lg">4. ตั้งค่า Webhook URL</h2>
            <p className="text-sm text-muted-foreground">คัดลอก URL นี้ไปใส่ใน LINE Developers Console</p>
            <div className="flex items-center gap-2 bg-secondary rounded-xl p-3">
              <code className="flex-1 text-xs font-mono text-foreground break-all">{webhookUrl}</code>
              <button onClick={() => copy(webhookUrl)} className="p-1.5 hover:text-[#C66A30] transition-colors shrink-0">
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              <li>ไปที่ <a href="https://developers.line.biz" target="_blank" className="text-[#C66A30] hover:underline">LINE Developers Console</a></li>
              <li>เลือก Channel → <strong>Messaging API</strong> tab</li>
              <li>ใส่ Webhook URL ด้านบน</li>
              <li>เปิด <strong>Use webhook</strong></li>
              <li>กด <strong>Verify</strong> เพื่อทดสอบ</li>
            </ol>
            <div className="flex gap-3">
              <button onClick={() => setStep(3)} className="flex-1 py-3 border border-black/10 rounded-xl text-sm font-medium">ย้อนกลับ</button>
              <button onClick={() => setStep(5)} className="flex-1 py-3 bg-[#06C755] text-white rounded-xl font-semibold flex items-center justify-center gap-2">
                ถัดไป <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 text-center">
            {testOk === null && (
              <>
                <div className="h-16 w-16 bg-[#06C755]/10 rounded-full flex items-center justify-center mx-auto">
                  <span className="text-3xl">💬</span>
                </div>
                <h2 className="font-bold text-lg">ทดสอบการเชื่อมต่อ</h2>
                <p className="text-sm text-muted-foreground">กดปุ่มด้านล่างเพื่อยืนยันว่าระบบเชื่อมต่อ LINE ได้สำเร็จ</p>
                <button onClick={testConnection} disabled={testing}
                  className="w-full py-3 bg-[#06C755] text-white rounded-xl font-semibold disabled:opacity-50">
                  {testing ? 'กำลังทดสอบ...' : 'ทดสอบเชื่อมต่อ'}
                </button>
              </>
            )}
            {testOk === true && (
              <>
                <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="font-bold text-lg text-emerald-700">เชื่อมต่อสำเร็จ!</h2>
                <p className="text-sm text-muted-foreground">ข้อความจากลูกค้าจะปรากฏใน AI Inbox โดยอัตโนมัติ</p>
                <Link href="/dashboard/inbox" className="block w-full py-3 bg-[#2A2522] text-white rounded-xl font-semibold">
                  ไป AI Inbox
                </Link>
              </>
            )}
            {testOk === false && (
              <>
                <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
                <h2 className="font-bold text-lg text-red-600">เชื่อมต่อไม่สำเร็จ</h2>
                <p className="text-sm text-muted-foreground">ตรวจสอบ Channel Secret และ Access Token อีกครั้ง</p>
                <button onClick={() => { setTestOk(null); setStep(3); }} className="w-full py-3 border border-black/10 rounded-xl text-sm font-medium">
                  แก้ไข Credentials
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
