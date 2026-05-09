import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const GuestBookingPatchSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('cancel'),
    reason: z.string().trim().max(500).optional().default('cancelled_by_guest'),
  }),
  z.object({
    action: z.literal('update_requests'),
    specialRequests: z.string().trim().max(1000).optional().nullable(),
    estimatedArrival: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  }),
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'guest.bookings.patch', 30, 60_000);
  if (limited) return limited;

  const { id } = await params;
  const parsed = await parseJson(request, GuestBookingPatchSchema);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify ownership
  const { data: reservation } = await supabase
    .from('reservations').select('id,status,check_in,guest_account_id').eq('id', id).single();
  if (!reservation || reservation.guest_account_id !== user.id) {
    return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  }

  if (parsed.data.action === 'cancel') {
    // Allow cancel if check_in > 24h from now
    const checkIn = new Date(reservation.check_in);
    const now = new Date();
    const hoursUntilCheckIn = (checkIn.getTime() - now.getTime()) / 3600000;
    if (hoursUntilCheckIn < 24) {
      return NextResponse.json({ error: 'ไม่สามารถยกเลิกได้ภายใน 24 ชั่วโมงก่อน check-in' }, { status: 400 });
    }

    const { error } = await supabase.from('reservations').update({
      status: 'cancelled',
      cancellation_reason: parsed.data.reason,
      cancelled_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await supabase.from('reservations').update({
    special_requests: parsed.data.specialRequests || null,
    estimated_arrival: parsed.data.estimatedArrival || null,
  }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
