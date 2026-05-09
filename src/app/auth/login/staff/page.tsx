'use client';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginStaff } from '@/lib/auth/role-login';

export default function RoleLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleRoleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await loginStaff(email, password);
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success('ยินดีต้อนรับพนักงาน');
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
        {loading ? 'กำลังเข้าสู่ระบบ...' : <>เข้าสู่ระบบพนักงาน<ArrowRight /></>}
      </Button>
    </form>
  );
}
