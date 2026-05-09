import { NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';

export const runtime = 'nodejs';

const ENV_CHECKS = [
  { key: 'NEXT_PUBLIC_APP_URL', label: 'Production app URL', live: (v?: string) => !!v?.startsWith('https://') },
  { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL', live: Boolean },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase anon key', live: Boolean },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', label: 'Supabase service role key', live: Boolean },
  { key: 'STRIPE_SECRET_KEY', label: 'Stripe live secret key', live: (v?: string) => !!v?.startsWith('sk_live_') },
  { key: 'STRIPE_WEBHOOK_SECRET', label: 'Stripe webhook secret', live: (v?: string) => !!v?.startsWith('whsec_') },
  { key: 'CRON_SECRET', label: 'Cron secret', live: Boolean },
  { key: 'OPS_ALERT_WEBHOOK_URL', label: 'Ops alert webhook', live: Boolean },
];

export async function GET() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin']);
  if (ctx.error) return ctx.error;

  const [{ count: roomCount }, { count: reservationCount }, { count: paymentCount }, { count: orderCount }] = await Promise.all([
    ctx.supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId),
    ctx.supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId),
    ctx.supabase.from('payments').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId),
    ctx.supabase.from('fb_orders').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId),
  ]);

  const checks = [
    ...ENV_CHECKS.map(item => ({
      key: item.key,
      label: item.label,
      ok: item.live(process.env[item.key]),
      category: 'environment',
    })),
    { key: 'rooms_seeded', label: 'Rooms exist', ok: Number(roomCount || 0) > 0, category: 'data' },
    { key: 'reservations_flow', label: 'Reservation flow has data', ok: Number(reservationCount || 0) > 0, category: 'workflow' },
    { key: 'payments_flow', label: 'Payments exist for invoice test', ok: Number(paymentCount || 0) > 0, category: 'workflow' },
    { key: 'pos_flow', label: 'F&B order flow has data', ok: Number(orderCount || 0) > 0, category: 'workflow' },
  ];

  const passed = checks.filter(c => c.ok).length;
  return NextResponse.json({
    status: passed === checks.length ? 'go-live-ready' : 'blocked',
    passed,
    total: checks.length,
    generatedAt: new Date().toISOString(),
    checks,
  }, { status: passed === checks.length ? 200 : 503, headers: { 'Cache-Control': 'no-store' } });
}
