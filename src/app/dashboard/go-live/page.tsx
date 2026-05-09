'use client';

import { useEffect, useState } from 'react';

type Check = { key: string; label: string; ok: boolean; category: string };
type GoLive = { status: string; passed: number; total: number; generatedAt: string; checks: Check[] };

export default function GoLivePage() {
  const [data, setData] = useState<GoLive | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [alertResult, setAlertResult] = useState<any>(null);

  async function load() {
    const [goLiveRes, healthRes] = await Promise.all([
      fetch('/api/ops/go-live-check', { cache: 'no-store' }),
      fetch('/api/ops/health', { cache: 'no-store' }),
    ]);
    setData(await goLiveRes.json());
    setHealth(await healthRes.json());
  }

  async function sendTestAlert() {
    const res = await fetch('/api/ops/alerts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'warning', title: 'Go-live alert test', message: 'Manual alert test before production launch.' }),
    });
    setAlertResult(await res.json());
  }

  useEffect(() => { load(); }, []);

  const groups = data?.checks.reduce<Record<string, Check[]>>((acc, check) => {
    acc[check.category] ||= [];
    acc[check.category].push(check);
    return acc;
  }, {}) || {};

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">P7 Go-Live</p>
        <h1 className="mt-2 text-3xl font-semibold">Production Go-Live Control</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          หน้านี้ใช้เช็คว่า env, payment live, domain, monitoring และ workflow หลักพร้อมโดนลูกค้าจริงกดเล่นหรือยัง
          เพราะการกด Deploy แล้วภาวนาไม่ใช่ strategy ถึงมนุษย์จะชอบทำกันก็ตาม
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={load} className="rounded-xl border px-4 py-2">Refresh checks</button>
          <button onClick={sendTestAlert} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground">Send test alert</button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Go-live status</p>
          <p className="mt-2 text-2xl font-bold">{data?.status === 'go-live-ready' ? 'Ready ✅' : 'Blocked ⚠️'}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Checklist</p>
          <p className="mt-2 text-2xl font-bold">{data ? `${data.passed}/${data.total}` : '-'}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Health</p>
          <p className="mt-2 text-2xl font-bold">{health?.status || '-'}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {Object.entries(groups).map(([category, checks]) => (
          <div key={category} className="rounded-3xl border bg-card p-6">
            <h2 className="text-xl font-semibold capitalize">{category}</h2>
            <div className="mt-4 divide-y">
              {checks.map(check => (
                <div key={check.key} className="flex items-center justify-between gap-4 py-3">
                  <span>{check.label}</span>
                  <span className={check.ok ? 'text-emerald-600' : 'text-red-600'}>{check.ok ? 'PASS' : 'FAIL'}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {alertResult && (
        <section className="rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Alert result</h2>
          <pre className="mt-4 overflow-auto rounded-xl bg-muted p-4 text-xs">{JSON.stringify(alertResult, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
