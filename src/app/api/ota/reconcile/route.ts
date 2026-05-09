import { NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'ota.reconcile', 10, 60_000);
  if (limited) return limited;

  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const { data: connections, error: connectionError } = await ctx.supabase
    .from('ota_connections')
    .select('id, provider, external_property_id, sync_rates, sync_inventory, sync_reservations')
    .eq('hotel_id', ctx.hotelId)
    .eq('status', 'active');

  if (connectionError) {
    return NextResponse.json({ error: connectionError.message }, { status: 500 });
  }

  const queued: Array<{ connectionId: string; provider: string }> = [];
  const skipped: Array<{ connectionId: string; provider: string; reason: string }> = [];

  for (const connection of connections || []) {
    if (!connection.external_property_id) {
      skipped.push({ connectionId: connection.id, provider: connection.provider, reason: 'missing_external_property_id' });
      continue;
    }

    const { data: job, error: jobError } = await ctx.supabase
      .from('ota_sync_queue')
      .insert({
        hotel_id: ctx.hotelId,
        connection_id: connection.id,
        provider: connection.provider,
        direction: 'pull',
        type: 'inventory',
        status: 'pending',
        payload: { mode: 'reconciliation', requestedBy: ctx.user.id },
        created_by: ctx.user.id,
      })
      .select('id')
      .single();

    if (jobError) {
      skipped.push({ connectionId: connection.id, provider: connection.provider, reason: jobError.message });
      continue;
    }

    queued.push({ connectionId: connection.id, provider: connection.provider });

    await ctx.supabase.from('ota_sync_logs').insert({
      hotel_id: ctx.hotelId,
      connection_id: connection.id,
      provider: connection.provider,
      direction: 'pull',
      status: 'queued_reconciliation',
      payload: { queue_id: job.id, type: 'inventory' },
      created_by: ctx.user.id,
    });
  }

  return NextResponse.json({
    success: true,
    queuedCount: queued.length,
    skippedCount: skipped.length,
    queued,
    skipped,
  });
}
