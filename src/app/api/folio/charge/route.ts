/**
 * Add manual charge to folio
 * e.g. minibar, laundry, phone calls, damage
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ChargeSchema = z.object({
  hotelId:       z.string().uuid(),
  reservationId: z.string().uuid(),
  description:   z.string().min(1).max(200),
  amount:        z.number().positive(),
  itemType:      z.enum(['room_charge','food_beverage','spa','laundry','minibar','phone','damage','other']).default('other'),
  quantity:      z.number().int().positive().default(1),
  unitPrice:     z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  const body = ChargeSchema.parse(await request.json());

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin', 'manager', 'receptionist']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();

  // Verify reservation belongs to hotel
  const { data: res } = await admin
    .from('reservations').select('id, status')
    .eq('id', body.reservationId).eq('hotel_id', body.hotelId).single();
  if (!res) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  if (res.status === 'checked_out' || res.status === 'cancelled')
    return NextResponse.json({ error: `Cannot add charge to ${res.status} reservation` }, { status: 400 });

  const totalAmount = body.unitPrice
    ? body.unitPrice * body.quantity
    : body.amount;

  const { data: item, error } = await admin.from('folio_items').insert({
    reservation_id: body.reservationId,
    hotel_id:       body.hotelId,
    description:    body.quantity > 1 ? `${body.description} (×${body.quantity})` : body.description,
    amount:         totalAmount,
    quantity:       body.quantity,
    unit_price:     body.unitPrice || body.amount,
    item_type:      body.itemType,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update folio balance
  await admin.from('folios')
    .update({ total_charges: totalAmount })  // Supabase will handle with RPC in production
    .eq('reservation_id', body.reservationId);

  // Recalculate folio totals
  const { data: allItems } = await admin.from('folio_items')
    .select('amount').eq('reservation_id', body.reservationId);
  const newTotal = allItems?.reduce((s, i) => s + Number(i.amount), 0) || 0;
  await admin.from('folios').update({ total_charges: newTotal, balance: newTotal }).eq('reservation_id', body.reservationId);

  await admin.from('audit_logs').insert({
    hotel_id: body.hotelId, action: 'folio.charge_added',
    entity_type: 'reservation', entity_id: body.reservationId,
    changes: { description: body.description, amount: totalAmount, type: body.itemType },
  });

  return NextResponse.json({ success: true, item, newFolioTotal: newTotal });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hotelId       = searchParams.get('hotelId') || '';
  const reservationId = searchParams.get('reservationId') || '';

  const ctx = await requireHotelAccess(hotelId);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  const { data: items } = await admin
    .from('folio_items')
    .select('*')
    .eq('reservation_id', reservationId)
    .order('created_at');

  const total = items?.reduce((s, i) => s + Number(i.amount), 0) || 0;
  return NextResponse.json({ items: items || [], total });
}
