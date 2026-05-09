/**
 * Payment Refund API
 * Supports full and partial refunds via Omise
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { rateLimit } from '@/lib/security/rate-limit';

const RefundSchema = z.object({
  reservationId: z.string().uuid(),
  hotelId:       z.string().uuid(),
  amount:        z.number().positive(),
  reason:        z.enum(['guest_request', 'hotel_error', 'overbooking', 'force_majeure', 'other']),
  notes:         z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'payments.refund', 20, 60_000);
  if (limited) return limited;

  const raw = await request.json();
  const result = RefundSchema.safeParse(raw);
  if (!result.success) {
    return NextResponse.json({ error: 'Validation failed', details: result.error.errors }, { status: 400 });
  }
  const { reservationId, hotelId, amount, reason, notes } = result.data;

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();

  // Get reservation + payment info
  const { data: reservation } = await admin
    .from('reservations')
    .select('id, status, total_amount, paid_amount, payment_status, omise_charge_id')
    .eq('id', reservationId)
    .eq('hotel_id', hotelId)
    .single();

  if (!reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  if (!reservation.omise_charge_id) return NextResponse.json({ error: 'No payment found for this reservation' }, { status: 400 });
  if (amount > Number(reservation.paid_amount)) {
    return NextResponse.json({ error: `Refund amount (${amount}) exceeds paid amount (${reservation.paid_amount})` }, { status: 400 });
  }

  // Fail closed: never silently mock refunds
  if (!process.env.OMISE_SECRET_KEY || process.env.OMISE_SECRET_KEY.includes('demo')) {
    return NextResponse.json(
      { error: 'Payment service not configured', code: 'PAYMENT_NOT_CONFIGURED' },
      { status: 503 }
    );
  }
  let refundResult: any;
  try {
    const omiseRes = await fetch(
      `https://api.omise.co/charges/${reservation.omise_charge_id}/refunds`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(process.env.OMISE_SECRET_KEY + ':').toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ amount: Math.round(amount * 100) }), // Omise uses satang
      }
    );
    refundResult = await omiseRes.json();
    if (!omiseRes.ok) {
      return NextResponse.json({ error: refundResult.message || 'Omise refund failed' }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }

  // Update reservation
  const newPaidAmount = Number(reservation.paid_amount) - amount;
  const newStatus = newPaidAmount <= 0 ? 'fully_refunded' : 'partially_refunded';

  await admin.from('reservations').update({
    paid_amount: newPaidAmount,
    payment_status: newStatus,
  }).eq('id', reservationId);

  // Add folio item for refund
  await admin.from('folio_items').insert({
    reservation_id: reservationId,
    hotel_id: hotelId,
    description: `Refund — ${reason}${notes ? ': ' + notes : ''}`,
    amount: -amount,
    item_type: 'refund',
    reference_id: refundResult.id,
  });

  // Audit log
  await admin.from('audit_logs').insert({
    hotel_id: hotelId,
    action: 'payment.refund',
    entity_type: 'reservation',
    entity_id: reservationId,
    changes: { amount, reason, notes, refund_id: refundResult.id, status: newStatus },
  });

  return NextResponse.json({
    success: true,
    refundId: refundResult.id,
    refundedAmount: amount,
    newPaidAmount,
    paymentStatus: newStatus,
  });
}
