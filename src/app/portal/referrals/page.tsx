'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

export default function PortalReferralsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyCode, setApplyCode] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch('/api/guest/referrals');
    const data = await res.json();
    setItems(data.referrals || []);
    setLoading(false);
  }

  async function createCode() {
    const res = await fetch('/api/guest/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', rewardType: 'percent', rewardValue: 10 }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || 'สร้างโค้ดไม่สำเร็จ');
    toast.success(`สร้างโค้ดแล้ว: ${data.referral.code}`);
    await load();
  }

  async function applyReferral() {
    const res = await fetch('/api/guest/referrals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'apply', code: applyCode }),
    });
    const data = await res.json();
    if (!res.ok || !data.valid) return toast.error(data.error || 'โค้ดใช้ไม่ได้');
    toast.success(`ใช้โค้ดสำเร็จ: ${data.referral.code} (${data.referral.reward_value}${data.referral.reward_type === 'percent' ? '%' : ' บาท'})`);
  }

  useEffect(() => { load(); }, []);

  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Affiliate / Referral</h1>
        <p className="text-sm text-muted-foreground">สร้างโค้ดแนะนำเพื่อนและนำโค้ดมาลดราคา</p>

        <div className="rounded-xl border bg-white p-4 space-y-3">
          <button onClick={createCode} className="rounded-lg bg-[#C66A30] px-4 py-2 text-sm font-medium text-white">สร้าง Referral Code</button>
          <div className="flex gap-2">
            <input value={applyCode} onChange={(e) => setApplyCode(e.target.value)} placeholder="ใส่โค้ด เช่น MTR-ABC123" className="flex-1 rounded-lg border px-3 py-2 text-sm" />
            <button onClick={applyReferral} className="rounded-lg border px-3 py-2 text-sm">ใช้โค้ด</button>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="mb-3 text-sm font-medium">โค้ดทั้งหมด</h2>
          {loading ? <p className="text-sm text-muted-foreground">กำลังโหลด...</p> : (
            <div className="space-y-2">
              {items.length === 0 ? <p className="text-sm text-muted-foreground">ยังไม่มีโค้ด</p> : items.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span className="font-mono">{item.code}</span>
                  <span>{item.reward_value}{item.reward_type === 'percent' ? '%' : ' บาท'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
