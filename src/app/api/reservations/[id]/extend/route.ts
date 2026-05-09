import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { assertReservationAccess, requireHotelAccess } from '@/lib/auth/guards';
import { assertRoomAvailable } from '@/lib/pms/availability';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  newCheckOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  additionalAmount: z.coerce.number().min(0).default(0),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'reservations.extend', 20, 60_000);
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
  if (!['confirmed', 'checked_in'].includes(reservation.status)) {
    return NextResponse.json({ error: 'Only confirmed or checked-in reservations can be extended' }, { status: 409 });
  }
  if (parsed.data.newCheckOut <= reservation.check_out) {
    return NextResponse.json({ error: 'newCheckOut must be after current check_out' }, { status: 400 });
  }

  const availability = await assertRoomAvailable({
    supabase: ctx.supabase,
    hotelId: reservation.hotel_id,
    roomId: reservation.room_id,
    roomTypeId: reservation.room_type_id,
    checkIn: reservation.check_out,
    checkOut: parsed.data.newCheckOut,
    excludeReservationId: reservation.id,
  });
  if (!availability.ok) {
    const err = 'error' in availability ? availability.error : 'Room not available';
    const status = 'status' in availability ? availability.status : 409;
    return NextResponse.json({ error: err }, { status: status || 409 });
  }

  const newTotal = Number(reservation.total_amount || 0) + parsed.data.additionalAmount;
  const { data, error } = await ctx.supabase.from('reservations')
    .update({ check_out: parsed.data.newCheckOut, total_amount: newTotal, internal_notes: [reservation.internal_notes, parsed.data.note].filter(Boolean).join('\n') || null })
    .eq('id', id)
    .eq('hotel_id', reservation.hotel_id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Extend stay failed' }, { status: 500 });

  const { data: folio } = await ctx.supabase.from('folios').select('id').eq('reservation_id', id).eq('hotel_id', reservation.hotel_id).limit(1).maybeSingle();
  if (folio?.id && parsed.data.additionalAmount > 0) {
    await ctx.supabase.from('folio_items').insert({ folio_id: folio.id, type: 'room', description: 'Extend stay charge', amount: parsed.data.additionalAmount, quantity: 1, posted_by: ctx.user?.id || null, reference_id: id, reference_type: 'reservation.extend' });
    await ctx.supabase.rpc('recalculate_folio_totals', { p_folio_id: folio.id });
  }
  await ctx.supabase.from('audit_logs').insert({ hotel_id: reservation.hotel_id, user_id: ctx.user?.id || null, action: 'reservation.extended', entity_type: 'reservation', entity_id: id, changes: parsed.data });
  return NextResponse.json({ reservation: data });
}
