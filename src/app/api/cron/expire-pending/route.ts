/**
 * Auto-expire pending_payment reservations
 * Runs every 15 min via Vercel Cron: "* /15 * * * *"
 * Releases held rooms back to inventory
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/guards';
import { expirePendingPayments } from '@/lib/booking/availability-lock';
import { sendCancellationEmail } from '@/lib/email-templates';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request);
  if (err) return err;

  const expired = await expirePendingPayments(15); // 15 min timeout

  // Notify guests of auto-cancelled reservations
  if (expired.length > 0 && process.env.SENDGRID_API_KEY) {
    const admin = createAdminClient();
    for (const res of expired) {
      const { data: full } = await admin
        .from('reservations')
        .select('reservation_code, check_in, check_out, guests(email, first_name, last_name), hotels(name)')
        .eq('id', res.id).single();

      const guest = full?.guests as any;
      const hotel = full?.hotels as any;
      if (guest?.email) {
        sendCancellationEmail({
          to: guest.email,
          guestName: `${guest.first_name} ${guest.last_name || ''}`.trim(),
          reservationCode: full?.reservation_code || res.id.slice(0,8),
          hotelName: hotel?.name || 'โรงแรม',
          checkIn:  full?.check_in || '',
          checkOut: full?.check_out || '',
          reason: 'ไม่ได้รับการชำระเงินภายในเวลาที่กำหนด',
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        }).catch(() => {});
      }
    }
  }

  return NextResponse.json({ success: true, expired: expired.length });
}
