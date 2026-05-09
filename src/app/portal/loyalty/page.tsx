'use client';

import { useEffect, useState } from 'react';

type LoyaltyData = {
  points: number;
  tier: string;
  totalStays?: number;
  transactions?: Array<{ points: number; description: string; type: string; created_at: string }>;
};

export default function LoyaltyPortalPage() {
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/guest/loyalty')
      .then(async (r) => {
        if (!r.ok) throw new Error('โหลดข้อมูล loyalty ไม่สำเร็จ');
        return r.json();
      })
      .then((json) => setData(json))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="mx-auto max-w-4xl p-6 text-sm text-muted-foreground">กำลังโหลดคะแนนสะสม...</div>;
  if (error) return <div className="mx-auto max-w-4xl p-6 text-sm text-red-600">{error}</div>;

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Loyalty Dashboard</h1>
        <p className="text-sm text-muted-foreground">ดูคะแนนสะสม ระดับสมาชิก และประวัติการเปลี่ยนแปลงคะแนน</p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">คะแนนสะสม</div>
          <div className="text-3xl font-bold mt-1">{(data?.points || 0).toLocaleString()}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">Tier</div>
          <div className="text-3xl font-bold mt-1 capitalize">{data?.tier || 'bronze'}</div>
        </div>
        <div className="rounded-xl border p-4">
          <div className="text-xs text-muted-foreground">เข้าพักทั้งหมด</div>
          <div className="text-3xl font-bold mt-1">{data?.totalStays || 0}</div>
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <h2 className="font-medium mb-3">ประวัติคะแนน</h2>
        <div className="space-y-2">
          {(data?.transactions || []).length === 0 ? (
            <div className="text-sm text-muted-foreground">ยังไม่มีประวัติคะแนน</div>
          ) : (
            data?.transactions?.map((tx, i) => (
              <div key={`${tx.created_at}-${i}`} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{tx.description || tx.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString('th-TH')}</div>
                </div>
                <div className={tx.points >= 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                  {tx.points >= 0 ? '+' : ''}{tx.points}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
