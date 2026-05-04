import { NextResponse } from 'next/server';
import { z } from 'zod';
import { calculateNights } from '@/lib/utils';
import { parseJson, dateStringSchema, dbError } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { rateLimit } from '@/lib/security/rate-limit';

const createReservationSchema = z.object({
  hotelId: z.string().uuid().optional(),
  roomId: z.string().uuid().optional().nullable(),
  roomTypeId: z.string().uuid(),
  ratePlanId: z.string().uuid().optional().nullable(),
  checkIn: dateStringSchema,
  checkOut: dateStringSchema,
  numAdults: z.coerce.number().int().min(1).max(20).default(1),
  numChildren: z.coerce.number().int().min(0).max(20).default(0),
  totalAmount: z.coerce.number().min(0),
  source: z.string().max(40).default('direct'),
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().max(120).optional().nullable(),
  email: z.string().email().optional().nullable(),
  phone: z.string().trim().max(40).optional().nullable(),
  nationality: z.string().trim().max(80).optional().nullable(),
  specialRequests: z.string().max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  const limited = rateLimit(request, 'reservations.create', 30, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, createReservationSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin', 'manager', 'front_desk']);
  if (ctx.error || !ctx.hotelId) return ctx.error;
  const supabase = ctx.supabase;
  const hotelId = ctx.hotelId;

  const nights = calculateNights(body.checkIn, body.checkOut);
  if (nights < 1 || nights > 365) return NextResponse.json({ error: 'Invalid stay dates' }, { status: 400 });

  const { data: roomType } = await supabase
    .from('room_types')
    .select('id')
    .eq('id', body.roomTypeId)
    .eq('hotel_id', hotelId)
    .single();
  if (!roomType) return NextResponse.json({ error: 'Room type not found' }, { status: 404 });

  if (body.roomId) {
    const { data: room } = await supabase
      .from('rooms')
      .select('id, status')
      .eq('id', body.roomId)
      .eq('hotel_id', hotelId)
      .eq('room_type_id', body.roomTypeId)
      .single();
    if (!room || ['maintenance', 'blocked'].includes(room.status)) {
      return NextResponse.json({ error: 'Room is not available' }, { status: 409 });
    }
  }

  let guest = null as any;
  if (body.email || body.phone) {
    const filters = [body.email ? `email.eq.${body.email}` : '', body.phone ? `phone.eq.${body.phone}` : ''].filter(Boolean).join(',');
    const result = await supabase.from('guests').select('id').eq('hotel_id', hotelId).or(filters).maybeSingle();
    guest = result.data;
  }

  if (!guest) {
    const { data: newGuest, error } = await supabase
      .from('guests')
      .insert({
        hotel_id: hotelId,
        first_name: body.firstName,
        last_name: body.lastName,
        email: body.email,
        phone: body.phone,
        nationality: body.nationality,
      })
      .select('id')
      .single();
    if (error) return dbError(error);
    guest = newGuest;
  }

  const { data: reservation, error } = await supabase
    .from('reservations')
    .insert({
      hotel_id: hotelId,
      guest_id: guest.id,
      room_id: body.roomId,
      room_type_id: body.roomTypeId,
      rate_plan_id: body.ratePlanId,
      check_in: body.checkIn,
      check_out: body.checkOut,
      num_adults: body.numAdults,
      num_children: body.numChildren,
      total_amount: body.totalAmount,
      source: body.source,
      special_requests: body.specialRequests,
      status: 'confirmed',
    })
    .select()
    .single();

  if (error) return dbError(error);

  await supabase.from('folios').insert({
    reservation_id: reservation.id,
    hotel_id: hotelId,
    status: 'open',
    total_charges: body.totalAmount,
    balance: body.totalAmount,
  });

  await supabase.from('audit_logs').insert({
    hotel_id: hotelId,
    user_id: ctx.user!.id,
    action: 'reservation.created',
    entity_type: 'reservation',
    entity_id: reservation.id,
    changes: { source: body.source, totalAmount: body.totalAmount },
  });

  return NextResponse.json({ success: true, reservation });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const requestedHotelId = searchParams.get('hotelId');
  const status = searchParams.get('status');

  const ctx = await requireHotelAccess(requestedHotelId);
  if (ctx.error || !ctx.hotelId) return ctx.error;

  let query = ctx.supabase
    .from('reservations')
    .select('*, guests(*), rooms(room_number), room_types(name)')
    .eq('hotel_id', ctx.hotelId);

  if (status) query = query.eq('status', status);

  const { data, error } = await query.order('check_in', { ascending: false }).limit(100);
  if (error) return dbError(error);
  return NextResponse.json({ reservations: data });
}
