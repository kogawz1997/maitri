'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

export default function GuestLoginPage() {
  const router = useRouter();
  const [next, setNext] = useState('/portal/bookings');
  const [verified, setVerified] = useState(false);
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNext(params.get('next') || '/portal/bookings');
    setVerified(params.get('verified') === '1');
  }, []);

  const [form, setForm] = useState({
    email: '', password: '', firstName: '', lastName: '',
    phone: '', confirmPassword: '', marketingConsent: false,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  async function requestWithTimeout(input: RequestInfo | URL, init?: RequestInit, timeoutMs = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      return await fetch(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'forgot') {
        await requestWithTimeout('/api/guest/auth/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email }),
        });
        toast.success('ส่งลิงก์รีเซ็ตรหัสผ่านไปยังอีเมลของคุณแล้ว');
        setMode('login');
        return;
      }

      if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          toast.error('รหัสผ่านไม่ตรงกัน');
          return;
        }
        const res = await requestWithTimeout('/api/guest/auth/register', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, password: form.password,
            firstName: form.firstName, lastName: form.lastName,
            phone: form.phone, marketingConsent: form.marketingConsent }),
        });
        const data = await res.json();
        if (!res.ok) { toast.error(data.error); return; }
        toast.success('สมัครสมาชิกสำเร็จ! กรุณาตรวจสอบอีเมลเพื่อยืนยัน');
        setMode('login');
        return;
      }

      const res = await requestWithTimeout('/api/guest/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      router.push(next);
      router.refresh();
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        toast.error('การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่อีกครั้ง');
      } else {
        toast.error('ไม่สามารถเชื่อมต่อระบบได้ กรุณาลองใหม่อีกครั้ง');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F7F4EF] to-[#FFF] p-4 lg:p-8">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.2fr,0.8fr] items-center">
        <section className="hidden lg:block">
          <p className="inline-flex rounded-full bg-[#C66A30]/10 px-3 py-1 text-xs font-medium text-[#A4522A]">Guest Marketplace Experience</p>
          <h2 className="mt-4 text-5xl font-serif text-[#2A2522] leading-tight">จองง่าย จัดการทริปง่าย
            <span className="block text-[#C66A30]">ทุกอย่างในที่เดียว</span>
          </h2>
          <p className="mt-5 max-w-xl text-[#2A2522]/70">ดูการจอง ชำระเงิน เพิ่มบริการ และรับสิทธิพิเศษแบบที่แพลตฟอร์มท่องเที่ยวสมัยใหม่ควรเป็น</p>
          <div className="mt-8 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-2xl border border-black/5 bg-white p-4"><p className="text-2xl font-bold text-[#2A2522]">24/7</p><p className="text-[#2A2522]/60">support</p></div>
            <div className="rounded-2xl border border-black/5 bg-white p-4"><p className="text-2xl font-bold text-[#2A2522]">1-click</p><p className="text-[#2A2522]/60">rebook</p></div>
            <div className="rounded-2xl border border-black/5 bg-white p-4"><p className="text-2xl font-bold text-[#2A2522]">Secure</p><p className="text-[#2A2522]/60">checkout</p></div>
          </div>
        </section>

        <div className="w-full max-w-md justify-self-center">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-[#2A2522] flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-serif text-2xl font-medium text-[#2A2522]">Maitri</span>
          </Link>
          <p className="text-sm text-[#2A2522]/50 mt-2">ระบบสำหรับแขกผู้เข้าพัก</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
          {verified && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 flex items-center gap-2">
              ✅ ยืนยันอีเมลสำเร็จแล้ว! เข้าสู่ระบบได้เลย
            </div>
          )}
          <h1 className="text-xl font-semibold text-[#2A2522] mb-6">
            {mode === 'login' ? 'เข้าสู่ระบบ' : mode === 'register' ? 'สมัครสมาชิก' : 'รีเซ็ตรหัสผ่าน'}
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="ชื่อ *" value={form.firstName} onChange={(v: string) => set('firstName', v)} placeholder="สมชาย" />
                <Field label="นามสกุล" value={form.lastName} onChange={(v: string) => set('lastName', v)} placeholder="ใจดี" />
              </div>
            )}

            <Field label="อีเมล *" type="email" value={form.email} onChange={(v: string) => set('email', v)} placeholder="you@email.com" />

            {mode === 'register' && (
              <Field label="เบอร์โทร" type="tel" value={form.phone} onChange={(v: string) => set('phone', v)} placeholder="0812345678" />
            )}

            {mode !== 'forgot' && (
              <Field label="รหัสผ่าน *" type="password" value={form.password} onChange={(v: string) => set('password', v)} placeholder="อย่างน้อย 8 ตัวอักษร" />
            )}

            {mode === 'register' && (
              <>
                <Field label="ยืนยันรหัสผ่าน *" type="password" value={form.confirmPassword} onChange={(v: string) => set('confirmPassword', v)} placeholder="พิมพ์รหัสผ่านอีกครั้ง" />
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.marketingConsent} onChange={e => set('marketingConsent', e.target.checked)} className="mt-0.5 rounded" />
                  <span className="text-xs text-[#2A2522]/60 leading-relaxed">ยินยอมรับโปรโมชั่นและข่าวสารทางอีเมล (สามารถยกเลิกได้ทุกเมื่อ)</span>
                </label>
              </>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#C66A30] hover:bg-[#A4522A] disabled:opacity-60 text-white font-medium py-3 rounded-xl transition-colors">
              {loading ? 'กำลังดำเนินการ...' : mode === 'login' ? 'เข้าสู่ระบบ' : mode === 'register' ? 'สมัครสมาชิก' : 'ส่งลิงก์รีเซ็ต'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-black/5 space-y-3 text-center text-sm">
            {mode === 'login' && (
              <>
                <button onClick={() => setMode('forgot')} className="text-[#C66A30] hover:underline block w-full">ลืมรหัสผ่าน?</button>
                <p className="text-[#2A2522]/50">ยังไม่มีบัญชี?{' '}
                  <button onClick={() => setMode('register')} className="text-[#C66A30] hover:underline">สมัครฟรี</button>
                </p>
              </>
            )}
            {mode !== 'login' && (
              <button onClick={() => setMode('login')} className="text-[#C66A30] hover:underline">← กลับไปหน้าเข้าสู่ระบบ</button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-[#2A2522]/40 mt-6">
          คุณเป็นเจ้าของโรงแรม?{' '}
          <Link href="/auth/login" className="text-[#C66A30] hover:underline">เข้าสู่ระบบที่นี่</Link>
        </p>
      </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#2A2522]/60 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} required={label.includes('*')}
        className="w-full px-4 py-2.5 bg-[#FAF7F2] border border-black/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C66A30]/30 focus:border-[#C66A30] transition-all" />
    </div>
  );
}
