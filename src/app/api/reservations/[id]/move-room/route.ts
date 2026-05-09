import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { assertReservationAccess, requireHotelAccess } from '@/lib/auth/guards';
import { assertRoomAvailable } from '@/lib/pms/availability';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({ roomId: z.string().uuid(), reason: z.string().max(500).optional().nullable() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'reservations.move-room', 20, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const ctx = await assertReservationAccess(id);
  if (ctx.error) return ctx.error;
  if (!ctx.reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  const role = await requireHotelAccess(ctx.reservation.hotel_id, ['owner', 'admin', 'manager', 'front_desk']);
  if (role.error) return role.error;

  const reservation = ctx.reservation;
  const availability = await assertRoomAvailable({
    supabase: ctx.supabase,
    hotelId: reservation.hotel_id,
    roomId: parsed.data.roomId,
    roomTypeId: reservation.room_type_id,
    checkIn: reservation.check_in,
    checkOut: reservation.check_out,
    excludeReservationId: reservation.id,
  });
  if (!availability.ok) {
    const err = 'error' in availability ? availability.error : 'Room not available';
    const status = 'status' in availability ? availability.status : 409;
    return NextResponse.json({ error: err }, { status: status || 409 });
  }

  const oldRoomId = reservation.room_id;
  const { data, error } = await ctx.supabase.from('reservations')
    .update({ room_id: parsed.data.roomId, internal_notes: [reservation.internal_notes, parsed.data.reason ? `Room moved: ${parsed.data.reason}` : null].filter(Boolean).join('\n') || null })
    .eq('id', id)
    .eq('hotel_id', reservation.hotel_id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Room move failed' }, { status: 500 });

  if (oldRoomId) await ctx.supabase.from('rooms').update({ status: 'cleaning' }).eq('id', oldRoomId).eq('hotel_id', reservation.hotel_id);
  if (reservation.status === 'checked_in') await ctx.supabase.from('rooms').update({ status: 'occupied' }).eq('id', parsed.data.roomId).eq('hotel_id', reservation.hotel_id);

  await ctx.supabase.from('audit_logs').insert({ hotel_id: reservation.hotel_id, user_id: ctx.user?.id || null, action: 'reservation.room_moved', entity_type: 'reservation', entity_id: id, changes: { oldRoomId, newRoomId: parsed.data.roomId, reason: parsed.data.reason } });
  return NextResponse.json({ reservation: data });
}
