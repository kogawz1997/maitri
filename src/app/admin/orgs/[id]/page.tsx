import { createAdminClient } from '@/lib/supabase/server';
import { getOrganizationUsage } from '@/lib/saas/usage';
import Link from 'next/link';


export const dynamic = 'force-dynamic';
export default async function AdminOrgDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const usage = await getOrganizationUsage(id);
  const { data: events } = await admin
    .from('operational_events')
    .select('id, event_type, severity, title, created_at, hotels(name)')
    .in('hotel_id', usage.hotels.map((h: any) => h.id))
    .order('created_at', { ascending: false })
    .limit(20);

  return (
    <main className="container max-w-6xl py-8 space-y-6">
      <Link href="/admin" className="text-sm text-muted-foreground hover:text-foreground">← Back to admin</Link>
      <section>
        <h1 className="text-2xl font-bold">{usage.organization?.name || 'Organization'}</h1>
        <p className="text-muted-foreground text-sm">Plan: {usage.plan} · Status: {usage.organization?.subscription_status || '-'}</p>
      </section>
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(usage.values).map(([key, value]) => (
          <div key={key} className="rounded-2xl border p-4 bg-card">
            <div className="text-xs uppercase text-muted-foreground">{key}</div>
            <div className="text-2xl font-bold">{String(value)}</div>
            <div className="text-xs text-muted-foreground">Limit: {String((usage.limits as any)[key])}</div>
          </div>
        ))}
      </div>
      <section className="rounded-2xl border bg-card p-4">
        <h2 className="font-semibold mb-3">Recent errors</h2>
        <div className="space-y-2 text-sm">
          {(events || []).map((event: any) => (
            <div key={event.id} className="flex items-center justify-between border-b pb-2 last:border-0">
              <span>{event.severity} · {event.title}</span>
              <span className="text-muted-foreground">{new Date(event.created_at).toLocaleString()}</span>
            </div>
          ))}
          {(!events || events.length === 0) && <p className="text-muted-foreground">No recent errors. Suspiciously peaceful.</p>}
        </div>
      </section>
    </main>
  );
}
