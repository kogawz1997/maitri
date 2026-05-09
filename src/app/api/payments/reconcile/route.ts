/**
 * Payment Reconciliation
 * Compare DB records vs Omise/Stripe transactions
 * Run manually or via cron to catch missed webhooks
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { format, subDays } from 'date-fns';
import { rateLimit } from '@/lib/security/rate-limit';
import { parseJson } from '@/lib/http/validation';
import { z } from 'zod';

const ReconcileSchema = z.object({
  hotelId: z.string().uuid(),
  days: z.coerce.number().int().min(1).max(90).optional().default(7),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'payments.reconcile', 10, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, ReconcileSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, days } = parsed.data;

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin']);
  if (ctx.error) return ctx.error;

  if (!process.env.OMISE_SECRET_KEY || process.env.OMISE_SECRET_KEY.includes('demo')) {
    return NextResponse.json(
      { error: 'Payment reconciliation is not configured', code: 'PAYMENT_RECONCILIATION_NOT_CONFIGURED' },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const since = format(subDays(new Date(), days), 'yyyy-MM-dd');

  // Get reservations with payment in last N days
  const { data: reservations } = await admin
    .from('reservations')
    .select('id, reservation_code, total_amount, paid_amount, payment_status, omise_charge_id, check_in')
    .eq('hotel_id', hotelId)
    .gte('check_in', since)
    .not('omise_charge_id', 'is', null);

  const issues: any[] = [];
  let verified = 0;

  for (const res of reservations || []) {
    if (!res.omise_charge_id) continue;

    try {
      const omiseRes = await fetch(
        `https://api.omise.co/charges/${res.omise_charge_id}`,
        { headers: { 'Authorization': `Basic ${Buffer.from(process.env.OMISE_SECRET_KEY + ':').toString('base64')}` } }
      );
      const charge = await omiseRes.json();

      if (!omiseRes.ok) {
        issues.push({
          reservationCode: res.reservation_code,
          issue: 'Omise reconciliation request failed',
          omiseStatus: charge?.status || omiseRes.status,
          dbStatus: res.payment_status,
        });
        continue;
      }

      const omiseAmount = Number(charge.amount || 0) / 100; // Convert from satang
      const omiseStatus = charge.status;

      if (omiseStatus === 'successful' && res.payment_status !== 'paid') {
        issues.push({
          reservationCode: res.reservation_code,
          issue: 'Omise shows paid but DB shows unpaid',
          omiseStatus, dbStatus: res.payment_status,
          omiseAmount, dbPaidAmount: res.paid_amount,
        });
        // Auto-fix only when the gateway state is authoritative.
        await admin.from('reservations').update({
          payment_status: 'paid',
          paid_amount: omiseAmount,
        }).eq('id', res.id);
      } else if (omiseStatus === 'failed' && !['failed', 'cancelled'].includes(res.payment_status || '')) {
        issues.push({
          reservationCode: res.reservation_code,
          issue: 'Omise shows failed but DB shows active',
          omiseStatus, dbStatus: res.payment_status,
        });
      } else {
        verified++;
      }
    } catch (error: any) {
      issues.push({
        reservationCode: res.reservation_code,
        issue: 'Omise reconciliation exception',
        message: error?.message || 'Unknown error',
        dbStatus: res.payment_status,
      });
    }
  }

  return NextResponse.json({
    success: true,
    period: `Last ${days} days`,
    total: reservations?.length || 0,
    verified,
    issues,
    autoFixed: issues.length,
  });
}
