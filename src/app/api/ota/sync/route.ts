import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security/rate-limit';
const BodySchema = z.object({ connection_id: z.string().uuid(), direction: z.enum(['push', 'pull']).default('push'), type: z.enum(['rates', 'inventory', 'reservations', 'full']).default('full'), payload: z.record(z.any()).optional() });
export async function POST(request: Request) {
  const limited = await rateLimit(request, 'ota.sync.create', 20, 60_000);
  if (limited) return limited;
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']); if (ctx.error) return ctx.error;
  const parsed = BodySchema.safeParse(await request.json()); if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { data: connection, error: connectionError } = await ctx.supabase.from('ota_connections').select('*').eq('id', parsed.data.connection_id).eq('hotel_id', ctx.hotelId).single();
  if (connectionError || !connection) return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
  const { data: job, error: jobError } = await ctx.supabase.from('ota_sync_queue').insert({ hotel_id: ctx.hotelId, connection_id: connection.id, provider: connection.provider, direction: parsed.data.direction, type: parsed.data.type, status: 'pending', payload: parsed.data.payload || { note: 'P8 OTA adapter queued. Add provider credentials for live sync.' }, created_by: ctx.user.id }).select('*').single();
  if (jobError) return NextResponse.json({ error: jobError.message }, { status: 500 });
  await ctx.supabase.from('ota_sync_logs').insert({ hotel_id: ctx.hotelId, connection_id: connection.id, provider: connection.provider, direction: parsed.data.direction, status: 'queued', payload: { queue_id: job.id, type: parsed.data.type }, created_by: ctx.user.id });
  return NextResponse.json(job, { status: 202 });
}
