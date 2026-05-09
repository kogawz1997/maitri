import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const TABLES = [
  'organizations', 'hotels', 'room_types', 'rooms', 'reservations', 'guests',
  'payments', 'folio_items', 'operational_events', 'automation_rules',
  'ota_connections', 'fb_menu_items', 'fb_orders', 'spa_services', 'spa_bookings',
];

export async function POST() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin']);
  if (ctx.error) return ctx.error;
  const admin = createAdminClient();

  const results = [];
  for (const table of TABLES) {
    const startedAt = Date.now();
    const { error } = await admin.from(table).select('*', { count: 'exact', head: true });
    results.push({ table, ok: !error, latencyMs: Date.now() - startedAt, error: error?.message });
  }

  const ok = results.every(r => r.ok);
  await admin.from('operational_events').insert({
    hotel_id: ctx.hotelId,
    event_type: 'smoke_test',
    severity: ok ? 'info' : 'error',
    title: ok ? 'P6 smoke test passed' : 'P6 smoke test failed',
    details: { results },
    source: 'ops',
  });

  return NextResponse.json({ ok, results, generatedAt: new Date().toISOString() }, { status: ok ? 200 : 500 });
}
