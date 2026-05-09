'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginManagement } from '@/lib/auth/role-login';

export default function ManagementLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRoleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginManagement(email, password);
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
    <form onSubmit={handleRoleLogin} className="space-y-4">
      <Input type="email" label="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" label="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'กำลังเข้าสู่ระบบ...' : <>เจ้าของโรงแรม / แอดมิน / เจ้าของเว็บ<ArrowRight /></>}
      </Button>
    </form>
  );
}
