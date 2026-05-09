'use client';

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { HOTEL_ROLES, HOTEL_ROLE_LABEL } from '@/lib/hotel-roles';

export default function CreateHotelUserPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '', role: 'front_desk' });
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/team/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'ไม่สามารถสร้างบัญชีได้');
      toast.success('สร้างผู้ใช้งานสำเร็จ');
      setForm({ fullName: '', email: '', password: '', role: 'front_desk' });
    } catch (e: any) {
      toast.error(e.message || 'เกิดข้อผิดพลาด');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">สร้างผู้ใช้งานโรงแรม (Owner only)</h1>
        <p className="text-sm text-muted-foreground">กำหนดอีเมล, รหัสผ่าน, และตำแหน่งให้ครบทุกแผนกในโรงแรม</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border p-5 bg-card">
        <input className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" placeholder="ชื่อพนักงาน" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} required />
        <input className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" type="email" placeholder="email@hotel.com" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required />
        <input className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" type="password" minLength={8} placeholder="รหัสผ่านอย่างน้อย 8 ตัว" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required />
        <select className="w-full rounded-lg bg-secondary px-3 py-2 text-sm" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
          {HOTEL_ROLES.map((role) => (
            <option key={role} value={role}>{HOTEL_ROLE_LABEL[role]}</option>
          ))}
        </select>
        <button className="w-full rounded-xl bg-[#2A2522] py-2.5 text-sm font-medium text-white disabled:opacity-50" disabled={loading}>
          {loading ? 'กำลังสร้าง...' : 'สร้างผู้ใช้งาน'}
        </button>
      </form>
      <Link href="/dashboard/team" className="text-sm text-muted-foreground underline">← กลับไปหน้าทีมงาน</Link>
    </div>
  );
}
