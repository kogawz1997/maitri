import { NextResponse } from 'next/server';
import { assertReservationAccess } from '@/lib/auth/guards';
import { calculateCancellationQuote } from '@/lib/pms/cancellation-policy';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await assertReservationAccess(id);
  if (ctx.error) return ctx.error;
  if (!ctx.reservation) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  const quote = calculateCancellationQuote({
    checkIn: ctx.reservation.check_in,
    totalAmount: Number(ctx.reservation.total_amount || 0),
    paidAmount: Number(ctx.reservation.paid_amount || 0),
    policy: ctx.reservation.cancellation_policy || null,
  });
  return NextResponse.json({ quote });
}
