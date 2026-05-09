import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const offers = [
  { code: 'airport_transfer', name: 'Airport Transfer', price: 900, category: 'transport' },
  { code: 'late_checkout', name: 'Late Check-out', price: 700, category: 'room' },
  { code: 'breakfast_upgrade', name: 'Breakfast Upgrade', price: 350, category: 'food' },
  { code: 'spa_package', name: 'Spa Package', price: 1200, category: 'wellness' },
];

const schema = z.object({
  offerCode: z.string().min(2),
  quantity: z.coerce.number().int().min(1).max(10).default(1),
  note: z.string().max(255).optional().nullable(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: reservation } = await supabase.from('reservations').select('id,guest_account_id,status').eq('id', id).single();
  if (!reservation || reservation.guest_account_id !== user.id) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  if (!['confirmed', 'checked_in', 'pending'].includes(reservation.status)) return NextResponse.json({ offers: [] });

  return NextResponse.json({ offers });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id,hotel_id,guest_account_id,status')
    .eq('id', id)
    .single();
  if (!reservation || reservation.guest_account_id !== user.id) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  if (!['confirmed', 'checked_in'].includes(reservation.status)) return NextResponse.json({ error: 'สถานะการจองไม่รองรับการซื้อ add-on' }, { status: 400 });

  const offer = offers.find((o) => o.code === parsed.data.offerCode);
  if (!offer) return NextResponse.json({ error: 'ไม่พบแพ็กเกจที่เลือก' }, { status: 404 });

  const { data: folio } = await supabase.from('folios').select('id').eq('reservation_id', reservation.id).limit(1).maybeSingle();
  if (!folio) return NextResponse.json({ error: 'Folio not found for reservation' }, { status: 404 });

  const amount = offer.price * parsed.data.quantity;
  const { error } = await supabase.from('folio_items').insert({
    folio_id: folio.id,
    type: 'service',
    description: `Add-on: ${offer.name}${parsed.data.note ? ` - ${parsed.data.note}` : ''}`,
    amount,
    quantity: 1,
    reference_type: 'guest.upsell',
    reference_id: reservation.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc('recalculate_folio_totals', { p_folio_id: folio.id });
  await supabase.from('audit_logs').insert({
    hotel_id: reservation.hotel_id,
    user_id: user.id,
    action: 'guest.upsell.accepted',
    entity_type: 'reservation',
    entity_id: reservation.id,
    changes: { offerCode: offer.code, quantity: parsed.data.quantity, amount },
  });

  return NextResponse.json({ success: true, offer: { ...offer, quantity: parsed.data.quantity, amount } });
}
