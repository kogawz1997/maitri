/**
 * Payment Receipt API
 * Returns receipt data for a reservation (used to render PDF)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { calculateVatBreakdown } from '@/lib/accounting/vat';
import { rateLimit } from '@/lib/security/rate-limit';

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'payments.receipt', 60, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const reservationId = searchParams.get('id') || '';
  const hotelId       = searchParams.get('hotelId') || '';

  const ctx = await requireHotelAccess(hotelId);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();

  const { data: res } = await admin
    .from('reservations')
    .select(`
      *, guests(first_name, last_name, email, phone, nationality),
      rooms(room_number, floor),
      room_types(name),
      hotels(name, address, phone, email, vat_rate, tax_id),
      folio_items(*)
    `)
    .eq('id', reservationId)
    .eq('hotel_id', hotelId)
    .single();

  if (!res) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const hotel  = res.hotels as any;
  const guest  = res.guests as any;
  const folioItems: any[] = res.folio_items || [];

  const subtotal   = folioItems.filter(f => f.amount > 0).reduce((s, f) => s + Number(f.amount), 0);
  const refunds    = folioItems.filter(f => f.amount < 0).reduce((s, f) => s + Number(f.amount), 0);
  const vat = calculateVatBreakdown({
    positiveItemsTotal: subtotal,
    adjustments: refunds,
    vatRate: Number(hotel?.vat_rate) || 0.07,
  });
  const totalDue = vat.total;

  return NextResponse.json({
    receiptNumber: `REC-${res.reservation_code}`,
    issuedAt: format(new Date(), "d MMMM yyyy 'เวลา' HH:mm", { locale: th }),
    hotel: {
      name: hotel?.name,
      address: hotel?.address,
      phone: hotel?.phone,
      email: hotel?.email,
      taxId: hotel?.tax_id,
    },
    guest: {
      name: `${guest?.first_name} ${guest?.last_name || ''}`.trim(),
      email: guest?.email,
      phone: guest?.phone,
    },
    reservation: {
      code: res.reservation_code,
      checkIn:  res.check_in,
      checkOut: res.check_out,
      nights:   res.nights,
      roomType: (res.room_types as any)?.name,
      roomNumber: (res.rooms as any)?.room_number,
      numAdults: res.num_adults,
    },
    lineItems: folioItems.map(f => ({
      description: f.description,
      amount:      Number(f.amount),
      type:        f.item_type,
    })),
    summary: {
      subtotal: vat.subtotal,
      vatRate: vat.vatRate * 100,
      vatAmount: vat.vatAmount,
      refunds: vat.adjustments,
      total: vat.total,
      paid: Number(res.paid_amount),
      balance: Math.round((totalDue - Number(res.paid_amount)) * 100) / 100,
    },
    paymentStatus: res.payment_status,
  });
}
