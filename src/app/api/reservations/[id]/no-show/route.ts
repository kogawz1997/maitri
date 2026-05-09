import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { assertReservationAccess, requireHotelAccess } from '@/lib/auth/guards';

const schema = z.object({ reason: z.string().max(500).optional().nullable() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const ctx = await assertReservationAccess(id);
  if (ctx.error) return ctx.error;
  if (!ctx.reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  const role = await requireHotelAccess(ctx.reservation.hotel_id, ['owner', 'admin', 'manager', 'front_desk']);
  if (role.error) return role.error;

  const { data, error } = await ctx.supabase.from('reservations')
    .update({ status: 'no_show', no_show_marked_at: new Date().toISOString(), cancellation_reason: parsed.data.reason || null })
    .eq('id', id)
    .eq('hotel_id', ctx.reservation.hotel_id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'No-show update failed' }, { status: 500 });

  await ctx.supabase.from('audit_logs').insert({ hotel_id: ctx.reservation.hotel_id, user_id: ctx.user?.id || null, action: 'reservation.no_show', entity_type: 'reservation', entity_id: id, changes: parsed.data });
  return NextResponse.json({ reservation: data });
}
