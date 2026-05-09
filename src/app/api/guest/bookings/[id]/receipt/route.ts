import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { calculateVatBreakdown } from '@/lib/accounting/vat';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: res } = await supabase
    .from('reservations')
    .select(`
      id,reservation_code,check_in,check_out,nights,num_adults,paid_amount,payment_status,hotel_id,guest_account_id,
      guests(first_name,last_name,email,phone),
      rooms(room_number),
      room_types(name),
      hotels(name,address,phone,email,vat_rate,tax_id),
      folio_items(description,amount,item_type)
    `)
    .eq('id', id)
    .single();

  if (!res || res.guest_account_id !== user.id) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });

  const hotel = res.hotels as any;
  const guest = res.guests as any;
  const folioItems: any[] = res.folio_items || [];
  const subtotal = folioItems.filter((f) => Number(f.amount) > 0).reduce((s, f) => s + Number(f.amount), 0);
  const refunds = folioItems.filter((f) => Number(f.amount) < 0).reduce((s, f) => s + Number(f.amount), 0);
  const vat = calculateVatBreakdown({ positiveItemsTotal: subtotal, adjustments: refunds, vatRate: Number(hotel?.vat_rate) || 0.07 });
  const paid = Number(res.paid_amount || 0);

  return NextResponse.json({
    receiptNumber: `REC-${res.reservation_code}`,
    issuedAt: format(new Date(), "d MMMM yyyy 'เวลา' HH:mm", { locale: th }),
    hotel: { name: hotel?.name, address: hotel?.address, phone: hotel?.phone, email: hotel?.email, taxId: hotel?.tax_id },
    guest: { name: `${guest?.first_name} ${guest?.last_name || ''}`.trim(), email: guest?.email, phone: guest?.phone },
    reservation: {
      code: res.reservation_code,
      checkIn: res.check_in,
      checkOut: res.check_out,
      nights: res.nights,
      roomType: (res.room_types as any)?.name,
      roomNumber: (res.rooms as any)?.room_number,
      numAdults: res.num_adults,
    },
    lineItems: folioItems.map((f) => ({ description: f.description, amount: Number(f.amount), type: f.item_type })),
    summary: {
      subtotal: vat.subtotal,
      vatRate: vat.vatRate * 100,
      vatAmount: vat.vatAmount,
      refunds: vat.adjustments,
      total: vat.total,
      paid,
      balance: Math.round((vat.total - paid) * 100) / 100,
    },
    paymentStatus: res.payment_status,
  });
}
