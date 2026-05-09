'use client';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { loginInternal } from '@/lib/auth/role-login';

export default function InternalLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [tokenValid, setTokenValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const error = params.get('error');
    if (error === 'session_expired') setErrorMessage('Session หมดอายุ กรุณาเข้าสู่ระบบใหม่');
    if (error === '2fa_required') setErrorMessage('บัญชีนี้ต้องยืนยัน 2FA ก่อนใช้งาน');
    if (!token) {
      setTokenValid(false);
      setErrorMessage('หน้านี้ใช้สำหรับพนักงานที่ได้รับลิงก์จากเจ้าของโรงแรมเท่านั้น');
      setTokenChecked(true);
      return;
    }

    fetch('/api/team/staff-login-validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error || 'invalid_token');
        setTokenValid(true);
      })
      .catch(() => {
        setTokenValid(false);
        toast.error('ลิงก์พนักงานไม่ถูกต้องหรือหมดอายุ');
      })
      .finally(() => setTokenChecked(true));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tokenValid) return;
    setLoading(true);
    try {
      const result = await loginInternal(email, password);
      if (!result.ok) return toast.error(result.message);
      toast.success('เข้าสู่ระบบสำเร็จ');
      window.location.href = result.redirectTo;
    } catch (error) {
      toast.error(error instanceof Error && error.message === 'AUTH_TIMEOUT' ? 'การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่' : 'ไม่สามารถเข้าสู่ระบบได้');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        {errorMessage && <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{errorMessage}</div>}
        <h1 className="font-display text-3xl font-medium tracking-tight">เข้าสู่ระบบพนักงาน/ผู้ดูแล</h1>
        <p className="text-sm text-muted-foreground mt-2">ลูกค้าเข้าใช้งานแยกที่หน้า Portal Login</p>
      </div>
      {!tokenChecked ? <p className="text-sm text-muted-foreground">กำลังตรวจสอบลิงก์พนักงาน...</p> : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input type="email" label="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={!tokenValid} />
          <Input type="password" label="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={!tokenValid} />
          <Button type="submit" className="w-full" disabled={loading || !tokenValid}>{loading ? 'กำลังเข้าสู่ระบบ...' : <>เข้าสู่ระบบ<ArrowRight /></>}</Button>
        </form>
      )}
    </div>
  );
}
