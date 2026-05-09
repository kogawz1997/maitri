/**
 * Extend Stay API
 * Extends check-out date if room is still available
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ExtendSchema = z.object({
  hotelId:       z.string().uuid(),
  reservationId: z.string().uuid(),
  newCheckOut:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  chargeExtra:   z.boolean().default(true),
});

export async function POST(request: NextRequest) {
  const raw = await request.json();
  const { data: body, error: ve } = (() => {
    const r = ExtendSchema.safeParse(raw);
    return r.success ? { data: r.data, error: null } : { data: null, error: r.error };
  })();
  if (!body) return NextResponse.json({ error: 'Validation failed' }, { status: 400 });

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin', 'manager', 'receptionist']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();

  const { data: res } = await admin
    .from('reservations')
    .select('*, room_types(base_rate), rooms(id)')
    .eq('id', body.reservationId).eq('hotel_id', body.hotelId).single();

  if (!res) return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
  if (!['confirmed', 'checked_in'].includes(res.status))
    return NextResponse.json({ error: `Cannot extend reservation in status: ${res.status}` }, { status: 400 });
  if (body.newCheckOut <= res.check_out)
    return NextResponse.json({ error: 'New check-out must be after current check-out' }, { status: 400 });

  // Check room availability for extended period
  const { data: conflicts } = await admin
    .from('reservations')
    .select('id, reservation_code')
    .eq('hotel_id', body.hotelId)
    .eq('room_type_id', res.room_type_id)
    .in('status', ['confirmed', 'checked_in', 'pending_payment'])
    .gt('check_in', res.check_out)           // starts after current checkout
    .lte('check_in', body.newCheckOut)       // but before new checkout
    .neq('id', body.reservationId);

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({
      error: 'ห้องไม่ว่างในช่วงที่ต้องการต่อ',
      conflictingReservation: conflicts[0].reservation_code,
    }, { status: 409 });
  }

  // Calculate extra nights and charge
  const oldNights   = Math.round((new Date(res.check_out).getTime() - new Date(res.check_in).getTime()) / 86400000);
  const newNights   = Math.round((new Date(body.newCheckOut).getTime() - new Date(res.check_in).getTime()) / 86400000);
  const extraNights = newNights - oldNights;
  const ratePerNight = Number((res.room_types as any)?.base_rate || res.total_amount / oldNights);
  const extraCharge  = body.chargeExtra ? ratePerNight * extraNights : 0;
  const newTotal     = Number(res.total_amount) + extraCharge;

  await admin.from('reservations').update({
    check_out:    body.newCheckOut,
    nights:       newNights,
    total_amount: newTotal,
  }).eq('id', body.reservationId);

  if (extraCharge > 0) {
    await admin.from('folio_items').insert({
      reservation_id: body.reservationId,
      hotel_id: body.hotelId,
      description: `ต่อห้อง ${extraNights} คืน (${res.check_out} → ${body.newCheckOut})`,
      amount: extraCharge,
      item_type: 'room_charge',
    });
    await admin.from('folios').update({
      total_charges: admin.rpc('increment_folio_charges', { res_id: body.reservationId, amount: extraCharge }),
      balance:       admin.rpc('increment_folio_charges', { res_id: body.reservationId, amount: extraCharge }),
    }).eq('reservation_id', body.reservationId);
  }

  await admin.from('audit_logs').insert({
    hotel_id: body.hotelId,
    action: 'reservation.extended',
    entity_type: 'reservation', entity_id: body.reservationId,
    changes: { old_checkout: res.check_out, new_checkout: body.newCheckOut, extra_nights: extraNights, extra_charge: extraCharge },
  });

  return NextResponse.json({ success: true, newCheckOut: body.newCheckOut, extraNights, extraCharge, newTotal });
}
