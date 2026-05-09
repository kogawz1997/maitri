import type { createAdminClient } from '@/lib/supabase/server';

type SupabaseAdmin = ReturnType<typeof createAdminClient>;
const ACTIVE_STATUSES = ['pending', 'confirmed', 'checked_in', 'on_hold'];

export async function assertRoomAvailable(params: {
  supabase: SupabaseAdmin;
  hotelId: string;
  roomId?: string | null;
  roomTypeId: string;
  checkIn: string;
  checkOut: string;
  excludeReservationId?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  const { supabase, hotelId, roomId, roomTypeId, checkIn, checkOut, excludeReservationId } = params;

  if (roomId) {
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status, room_type_id')
      .eq('id', roomId)
      .eq('hotel_id', hotelId)
      .single();

    if (!room || room.room_type_id !== roomTypeId) return { ok: false, error: 'Room not found for this room type', status: 404 };
    if (['maintenance', 'blocked', 'out_of_order'].includes(room.status)) return { ok: false, error: 'Room is not available', status: 409 };

    let overlap = supabase
      .from('reservations')
      .select('id', { count: 'exact', head: true })
      .eq('hotel_id', hotelId)
      .eq('room_id', roomId)
      .in('status', ACTIVE_STATUSES)
      .lt('check_in', checkOut)
      .gt('check_out', checkIn);
    if (excludeReservationId) overlap = overlap.neq('id', excludeReservationId);
    const { count } = await overlap;
    if ((count || 0) > 0) return { ok: false, error: 'Room is already booked for these dates', status: 409 };
    return { ok: true };
  }

  const { count: roomCount } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('room_type_id', roomTypeId)
    .not('status', 'in', '(maintenance,blocked,out_of_order)');

  let reservations = supabase
    .from('reservations')
    .select('id', { count: 'exact', head: true })
    .eq('hotel_id', hotelId)
    .eq('room_type_id', roomTypeId)
    .in('status', ACTIVE_STATUSES)
    .lt('check_in', checkOut)
    .gt('check_out', checkIn);
  if (excludeReservationId) reservations = reservations.neq('id', excludeReservationId);
  const { count: usedCount } = await reservations;

  if ((usedCount || 0) >= (roomCount || 0)) return { ok: false, error: 'No rooms available for these dates', status: 409 };
  return { ok: true };
}
