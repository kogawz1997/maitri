/**
 * Deposit Payment API
 * Charge partial amount (e.g. 30%) and mark reservation as partially_paid
 * Guest pays remaining balance at hotel
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { RATE_LIMITS } from '@/lib/validation';
import { z } from 'zod';

const DepositSchema = z.object({
  reservationId: z.string().uuid(),
  token:         z.string().min(1),      // Omise card token
  depositPercent: z.number().min(10).max(100).default(30),
});

export async function POST(request: NextRequest) {
  const rl = await rateLimit(request, 'payment', RATE_LIMITS.payment.limit, RATE_LIMITS.payment.windowMs);
  if (rl) return rl;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const raw = await request.json();
  const result = DepositSchema.safeParse(raw);
  if (!result.success) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
  const { reservationId, token, depositPercent } = result.data;

  const admin = createAdminClient();
  const { data: res } = await admin
    .from('reservations')
    .select('*, hotels(name, omise_public_key)')
    .eq('id', reservationId)
    .single();

  if (!res) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  if (!['pending_payment', 'confirmed'].includes(res.status)) {
    return NextResponse.json({ error: `Cannot charge reservation in status: ${res.status}` }, { status: 400 });
  }

  const depositAmount = Math.round(Number(res.total_amount) * (depositPercent / 100));

  // Fail closed: never silently mock payments
  if (!process.env.OMISE_SECRET_KEY || process.env.OMISE_SECRET_KEY.includes('demo')) {
    return NextResponse.json(
      { error: 'Payment service not configured', code: 'PAYMENT_NOT_CONFIGURED' },
      { status: 503 }
    );
  }
  const omiseRes = await fetch('https://api.omise.co/charges', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(process.env.OMISE_SECRET_KEY + ':').toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: depositAmount * 100,  // satang
      currency: 'thb',
      card: token,
      description: `Deposit ${depositPercent}% — ${res.reservation_code}`,
      metadata: { reservation_id: reservationId, type: 'deposit' },
    }),
  });
  const chargeResult: any = await omiseRes.json();
  if (!omiseRes.ok || chargeResult.status === 'failed') {
    return NextResponse.json({ error: chargeResult.failure_message || 'Payment failed' }, { status: 402 });
  }

  // Update reservation
  const newStatus  = depositPercent >= 100 ? 'confirmed' : 'confirmed';
  const payStatus  = depositPercent >= 100 ? 'paid' : 'deposit_paid';

  await admin.from('reservations').update({
    status:            newStatus,
    payment_status:    payStatus,
    paid_amount:       depositAmount,
    deposit_amount:    depositAmount,
    omise_charge_id:   chargeResult.id,
    payment_at:        new Date().toISOString(),
  }).eq('id', reservationId);

  await admin.from('folio_items').insert({
    reservation_id: reservationId,
    hotel_id:       res.hotel_id,
    description:    `Deposit ${depositPercent}% — ${chargeResult.id}`,
    amount:         depositAmount,
    item_type:      'deposit',
    reference_id:   chargeResult.id,
  });

  return NextResponse.json({
    success: true,
    depositAmount,
    remainingAmount: Number(res.total_amount) - depositAmount,
    chargeId: chargeResult.id,
    paymentStatus: payStatus,
    message: `ชำระมัดจำ ${depositPercent}% สำเร็จ ยอดค้างชำระ ฿${(Number(res.total_amount) - depositAmount).toLocaleString()} จ่ายที่โรงแรม`,
  });
}
