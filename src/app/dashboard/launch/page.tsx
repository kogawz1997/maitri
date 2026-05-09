'use client';

import { useEffect, useState } from 'react';

type Readiness = {
  status: 'ready' | 'blocked';
  checks: Record<string, { ok: boolean; message: string; latencyMs?: number }>;
  generatedAt: string;
};

export default function LaunchReadinessPage() {
  const [data, setData] = useState<Readiness | null>(null);
  const [smoke, setSmoke] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch('/api/ops/readiness', { cache: 'no-store' });
    setData(await res.json());
  }

  async function runSmoke() {
    setLoading(true);
    try {
      const res = await fetch('/api/ops/smoke-test', { method: 'POST' });
      setSmoke(await res.json());
    } finally {
      setLoading(false);
      load();
    }
  }

  useEffect(() => { load(); }, []);

  const checks = data ? Object.entries(data.checks) : [];
  const passed = checks.filter(([, c]) => c.ok).length;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <section className="rounded-3xl border bg-card p-6 shadow-sm">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">Production</p>
        <h1 className="mt-2 text-3xl font-semibold">Launch Readiness</h1>
        <p className="mt-2 text-muted-foreground">
          เช็คสถานะ env, database, billing, automation และ smoke test ก่อนเปิดให้ลูกค้าจริงกดเล่นชีวิตเรา
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button onClick={load} className="rounded-xl border px-4 py-2">Refresh</button>
          <button onClick={runSmoke} disabled={loading} className="rounded-xl bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50">
            {loading ? 'Running...' : 'Run smoke test'}
          </button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Status</p>
          <p className="mt-2 text-2xl font-bold">{data?.status === 'ready' ? 'Ready ✅' : 'Blocked ⚠️'}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Checks</p>
          <p className="mt-2 text-2xl font-bold">{passed}/{checks.length}</p>
        </div>
        <div className="rounded-2xl border bg-card p-5">
          <p className="text-sm text-muted-foreground">Last generated</p>
          <p className="mt-2 text-sm font-medium">{data?.generatedAt || '-'}</p>
        </div>
      </section>

      <section className="rounded-3xl border bg-card p-6">
        <h2 className="text-xl font-semibold">Readiness checks</h2>
        <div className="mt-4 divide-y">
          {checks.map(([name, check]) => (
            <div key={name} className="flex items-start justify-between gap-4 py-4">
              <div>
                <p className="font-medium">{name}</p>
                <p className="text-sm text-muted-foreground">{check.message}</p>
              </div>
              <span className={check.ok ? 'text-emerald-600' : 'text-red-600'}>{check.ok ? 'PASS' : 'FAIL'}</span>
            </div>
          ))}
        </div>
      </section>

      {smoke && (
        <section className="rounded-3xl border bg-card p-6">
          <h2 className="text-xl font-semibold">Smoke test result</h2>
          <pre className="mt-4 max-h-96 overflow-auto rounded-xl bg-muted p-4 text-xs">{JSON.stringify(smoke, null, 2)}</pre>
        </section>
      )}
    </main>
  );
}
