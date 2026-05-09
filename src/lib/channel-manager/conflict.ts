/**
 * OTA Booking Conflict Handler
 * Detects and resolves double-bookings from multiple channels
 */
import { createAdminClient } from '@/lib/supabase/server';

export interface ConflictResult {
  hasConflict: boolean;
  reason?: string;
  existingReservationId?: string;
  resolution?: 'reject_new' | 'cancel_existing' | 'manual';
}

export async function handleChannelConflict(
  admin: ReturnType<typeof createAdminClient>,
  hotelId: string,
  incomingBooking: {
    id: string;
    checkIn: string;
    checkOut: string;
    roomTypeId?: string;
    roomId?: string;
    channel: string;
  }
): Promise<ConflictResult> {
  // Find any overlapping confirmed reservations for same room type
  const query = admin
    .from('reservations')
    .select('id, reservation_code, source, status, check_in, check_out')
    .eq('hotel_id', hotelId)
    .in('status', ['confirmed', 'checked_in', 'pending_payment'])
    .lt('check_in', incomingBooking.checkOut)
    .gt('check_out', incomingBooking.checkIn);

  if (incomingBooking.roomId) {
    query.eq('room_id', incomingBooking.roomId);
  } else if (incomingBooking.roomTypeId) {
    query.eq('room_type_id', incomingBooking.roomTypeId);
  }

  const { data: conflicts } = await query;

  if (!conflicts?.length) return { hasConflict: false };

  // Conflict found
  const existing = conflicts[0];

  // Policy: prefer direct booking over OTA
  const directSources = ['direct', 'walk_in', 'phone'];
  const isExistingDirect = directSources.includes(existing.source);

  if (isExistingDirect) {
    return {
      hasConflict: true,
      reason: `Room already booked direct (${existing.reservation_code})`,
      existingReservationId: existing.id,
      resolution: 'reject_new',
    };
  }

  // Both from OTAs — flag for manual review
  return {
    hasConflict: true,
    reason: `Double-booking from ${incomingBooking.channel} conflicts with ${existing.source} (${existing.reservation_code})`,
    existingReservationId: existing.id,
    resolution: 'manual',
  };
}

/**
 * Get conflict summary for dashboard
 */
export async function getConflictSummary(hotelId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('audit_logs')
    .select('id, changes, created_at')
    .eq('hotel_id', hotelId)
    .eq('action', 'channel.booking_conflict')
    .order('created_at', { ascending: false })
    .limit(20);

  return data || [];
}
