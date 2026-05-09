import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';

export const runtime = 'nodejs';

function since(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export async function GET() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  const from = since(24);

  const [events, subscriptions, ota] = await Promise.all([
    admin.from('operational_events').select('event_type,severity,created_at').gte('created_at', from).limit(1000),
    admin.from('subscriptions').select('status,plan').limit(1000),
    admin.from('ota_sync_ledger').select('status,channel,created_at').gte('created_at', from).limit(1000),
  ]);

  const eventRows = events.data || [];
  const otaRows = ota.data || [];
  const subscriptionRows = subscriptions.data || [];

  const bySeverity = eventRows.reduce((acc: Record<string, number>, row: any) => {
    const key = row.severity || 'info';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  const otaFailures = otaRows.filter((row: any) => ['failed', 'conflict'].includes(row.status)).length;
  const paymentFailures = eventRows.filter((row: any) => String(row.event_type || '').includes('payment') && row.severity === 'error').length;
  const clientErrors = eventRows.filter((row: any) => String(row.event_type || '').includes('client')).length;

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    windowHours: 24,
    checks: {
      events: events.error ? events.error.message : 'ok',
      subscriptions: subscriptions.error ? subscriptions.error.message : 'ok',
      ota: ota.error ? ota.error.message : 'ok',
    },
    metrics: {
      operationalEvents: eventRows.length,
      bySeverity,
      paymentFailures,
      otaFailures,
      clientErrors,
      activeSubscriptions: subscriptionRows.filter((row: any) => row.status === 'active').length,
      trialSubscriptions: subscriptionRows.filter((row: any) => row.status === 'trialing').length,
    },
  }, { headers: { 'Cache-Control': 'no-store' } });
}
