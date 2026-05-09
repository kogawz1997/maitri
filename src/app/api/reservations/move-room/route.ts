/**
 * Room Move API
 * Move guest to a different room (same or different room type)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const MoveSchema = z.object({
  hotelId:       z.string().uuid(),
  reservationId: z.string().uuid(),
  newRoomId:     z.string().uuid(),
  reason:        z.string().max(200).optional(),
  adjustRate:    z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  const raw  = await request.json();
  const body = MoveSchema.parse(raw);

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin', 'manager', 'receptionist']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();

  const [{ data: res }, { data: newRoom }] = await Promise.all([
    admin.from('reservations').select('*, rooms(room_number), room_types(name, base_rate)')
      .eq('id', body.reservationId).eq('hotel_id', body.hotelId).single(),
    admin.from('rooms').select('id, room_number, floor, room_type_id, room_types(name, base_rate)')
      .eq('id', body.newRoomId).eq('hotel_id', body.hotelId).single(),
  ]);

  if (!res)     return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  if (!newRoom) return NextResponse.json({ error: 'New room not found' }, { status: 404 });
  if (newRoom.id === res.room_id)
    return NextResponse.json({ error: 'Already in this room' }, { status: 400 });

  // Check new room availability
  const { data: conflicts } = await admin
    .from('reservations')
    .select('id')
    .eq('room_id', body.newRoomId)
    .in('status', ['confirmed', 'checked_in'])
    .lt('check_in', res.check_out)
    .gt('check_out', res.check_in)
    .neq('id', body.reservationId);

  if (conflicts?.length) return NextResponse.json({ error: 'ห้องที่ต้องการย้ายไปถูกจองแล้ว' }, { status: 409 });

  const oldRoom    = res.rooms as any;
  const newRoomType = newRoom.room_types as any;
  const updates: any = { room_id: body.newRoomId, room_type_id: newRoom.room_type_id };

  // Optionally adjust rate to new room type
  if (body.adjustRate && newRoomType?.base_rate) {
    const nights = Number(res.nights);
    updates.total_amount = newRoomType.base_rate * nights;
  }

  await admin.from('reservations').update(updates).eq('id', body.reservationId);
  await admin.from('audit_logs').insert({
    hotel_id: body.hotelId,
    action: 'reservation.room_moved',
    entity_type: 'reservation', entity_id: body.reservationId,
    changes: {
      from_room: oldRoom?.room_number,
      to_room:   newRoom.room_number,
      reason:    body.reason,
    },
  });

  return NextResponse.json({
    success: true,
    movedTo: { roomNumber: newRoom.room_number, floor: newRoom.floor, typeName: newRoomType?.name },
  });
}
