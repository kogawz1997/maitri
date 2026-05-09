'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="h-10 w-10 rounded-xl bg-[#2A2522] flex items-center justify-center">
              <span className="text-white font-bold text-lg">M</span>
            </div>
            <span className="font-serif text-2xl font-medium text-[#2A2522]">Maitri</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-black/5 p-8">
          {sent ? (
            <div className="text-center">
              <div className="h-16 w-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-semibold text-[#2A2522] mb-2">เช็คอีเมลของคุณ</h2>
              <p className="text-sm text-[#2A2522]/60 mb-6">
                เราส่งลิงก์รีเซ็ตรหัสผ่านไปที่<br />
                <strong className="text-[#2A2522]">{email}</strong>
              </p>
              <p className="text-xs text-[#2A2522]/40">ไม่เห็นอีเมล? ตรวจสอบโฟลเดอร์ Spam</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-[#2A2522] mb-1">ลืมรหัสผ่าน?</h1>
                <p className="text-sm text-[#2A2522]/50">ใส่อีเมลของคุณเพื่อรับลิงก์รีเซ็ต</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-[#2A2522]/60 mb-1.5 block">อีเมล</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#2A2522]/30" />
                    <input
                      type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="your@email.com" required
                      className="w-full pl-10 pr-4 py-2.5 bg-[#FAF7F2] border border-black/8 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#C66A30]/30 focus:border-[#C66A30]"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading || !email.trim()}
                  className="w-full py-3 bg-[#C66A30] hover:bg-[#A4522A] text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50">
                  {loading ? 'กำลังส่ง...' : 'ส่งลิงก์รีเซ็ต'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="text-center mt-4">
          <Link href="/auth/login" className="inline-flex items-center gap-1 text-sm text-[#2A2522]/40 hover:text-[#C66A30] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> กลับไปเข้าสู่ระบบ
          </Link>
        </div>
      </div>
    </div>
  );
}
