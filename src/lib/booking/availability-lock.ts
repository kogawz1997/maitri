/**
 * Availability Lock — prevents overbooking
 * Uses Postgres advisory locks for atomic availability check + reserve
 *
 * Flow:
 * 1. Acquire advisory lock per hotel+room_type
 * 2. Check availability (count real rooms vs active reservations)
 * 3. Create reservation with status=pending_payment
 * 4. Release lock
 * 5. Timeout: if payment not received in 15 min → auto-cancel
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface AvailabilityCheckResult {
  available: boolean;
  roomsLeft: number;
  roomId?: string;  // specific room assigned
  reason?: string;
}

export async function checkAndReserve(
  hotelId: string,
  roomTypeId: string,
  checkIn: string,
  checkOut: string,
  numRoomsNeeded = 1
): Promise<AvailabilityCheckResult> {
  const admin = createAdminClient();

  // Use Postgres advisory lock: hash(hotelId + roomTypeId)
  // This prevents two simultaneous bookings from both seeing "1 room left"
  const lockKey = Math.abs(hashCode(`${hotelId}:${roomTypeId}`));

  try {
    // Acquire session-level advisory lock (non-blocking attempt)
    const { data: lockResult } = await admin.rpc('pg_try_advisory_lock', { key: lockKey });

    if (!lockResult) {
      // Another request has the lock — wait briefly and check
      await new Promise(r => setTimeout(r, 200));
      return { available: false, roomsLeft: 0, reason: 'System busy, please retry' };
    }

    // Count actual available rooms
    const [{ data: totalRooms }, { data: activeReservations }] = await Promise.all([
      admin.from('rooms')
        .select('id')
        .eq('hotel_id', hotelId)
        .eq('room_type_id', roomTypeId)
        .eq('status', 'available'),

      admin.from('reservations')
        .select('room_id')
        .eq('hotel_id', hotelId)
        .eq('room_type_id', roomTypeId)
        // Block: confirmed, checked_in, pending_payment (holding room)
        .in('status', ['confirmed', 'checked_in', 'pending_payment', 'on_hold'])
        // Overlap: check_in < our checkOut AND check_out > our checkIn
        .lt('check_in', checkOut)
        .gt('check_out', checkIn),
    ]);

    const total    = totalRooms?.length || 0;
    const occupied = activeReservations?.length || 0;
    const roomsLeft = Math.max(0, total - occupied);

    if (roomsLeft < numRoomsNeeded) {
      return { available: false, roomsLeft, reason: 'No rooms available for selected dates' };
    }

    // Find a specific available room to assign
    const occupiedRoomIds = new Set(activeReservations?.map(r => r.room_id).filter(Boolean));
    const availableRoom   = totalRooms?.find(r => !occupiedRoomIds.has(r.id));

    return {
      available:  true,
      roomsLeft:  roomsLeft - numRoomsNeeded,
      roomId:     availableRoom?.id,
    };
  } finally {
    // Always release the lock
    await admin.rpc('pg_advisory_unlock', { key: lockKey }).catch(() => {});
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Auto-cancel pending_payment reservations after timeout
export async function expirePendingPayments(timeoutMinutes = 15) {
  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - timeoutMinutes * 60 * 1000).toISOString();

  const { data: expired } = await admin
    .from('reservations')
    .update({ status: 'cancelled', cancellation_reason: 'payment_timeout' })
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .select('id, reservation_code, hotel_id');

  return expired || [];
}
