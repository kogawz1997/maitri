import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const bookingSchema = z.object({
  reservationId: z.string().uuid().optional().nullable(),
  guestId: z.string().uuid().optional().nullable(),
  serviceId: z.string().uuid(),
  therapistId: z.string().uuid().optional().nullable(),
  startTime: z.string().datetime(),
  notes: z.string().optional().nullable(),
});

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function ensureOpenFolio(supabase: any, hotelId: string, reservationId: string) {
  const { data: folio } = await supabase
    .from('folios')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('reservation_id', reservationId)
    .eq('status', 'open')
    .maybeSingle();
  if (folio) return folio;
  const { data, error } = await supabase
    .from('folios')
    .insert({ hotel_id: hotelId, reservation_id: reservationId, status: 'open' })
    .select('id')
    .single();
  if (error) throw new Error(error.message);
  return data;
}

async function recalcFolio(supabase: any, folioId: string) {
  const { data: items } = await supabase.from('folio_items').select('type,amount,quantity').eq('folio_id', folioId);
  const totals = (items || []).reduce((acc: any, item: any) => {
    const amount = Number(item.amount || 0) * Number(item.quantity || 1);
    if (item.type === 'payment' || item.type === 'refund') acc.payments += amount;
    else acc.charges += amount;
    return acc;
  }, { charges: 0, payments: 0 });
  await supabase.from('folios').update({ total_charges: totals.charges, total_payments: totals.payments, balance: totals.charges - totals.payments }).eq('id', folioId);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ctx = await requireHotelAccess(searchParams.get('hotelId'));
  if (ctx.error) return ctx.error;

  const from = searchParams.get('from') || new Date().toISOString();
  const toDate = new Date(from);
  toDate.setDate(toDate.getDate() + 14);

  const { data, error } = await ctx.supabase
    .from('spa_bookings')
    .select('id,start_time,end_time,status,amount,payment_method,notes,reservation_id,spa_services(name,duration_min,price),spa_therapists(name),guests(first_name,last_name)')
    .eq('hotel_id', ctx.hotelId)
    .gte('start_time', from)
    .lte('start_time', toDate.toISOString())
    .order('start_time');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']);
  if (ctx.error) return ctx.error;

  const parsed = bookingSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const body = parsed.data;

  const { data: service, error: serviceError } = await ctx.supabase
    .from('spa_services')
    .select('id,name,duration_min,price,active')
    .eq('id', body.serviceId)
    .eq('hotel_id', ctx.hotelId)
    .single();

  if (serviceError || !service || !service.active) return NextResponse.json({ error: 'Spa service not found or inactive' }, { status: 404 });

  if (body.reservationId) {
    const { data: reservation } = await ctx.supabase
      .from('reservations')
      .select('id,hotel_id,guest_id,status')
      .eq('id', body.reservationId)
      .eq('hotel_id', ctx.hotelId)
      .single();
    if (!reservation) return NextResponse.json({ error: 'Reservation not found in this hotel' }, { status: 404 });
    if (!body.guestId && reservation.guest_id) body.guestId = reservation.guest_id;
  }

  const start = new Date(body.startTime);
  const end = addMinutes(start, Number(service.duration_min || 60));

  if (body.therapistId) {
    const { data: clash, error: clashError } = await ctx.supabase
      .from('spa_bookings')
      .select('id,start_time,end_time')
      .eq('hotel_id', ctx.hotelId)
      .eq('therapist_id', body.therapistId)
      .not('status', 'in', '(cancelled,no_show)')
      .lt('start_time', end.toISOString())
      .gt('end_time', start.toISOString())
      .limit(1);

    if (clashError) return NextResponse.json({ error: clashError.message }, { status: 400 });
    if ((clash || []).length > 0) return NextResponse.json({ error: 'Therapist already has a booking in this time slot' }, { status: 409 });
  }

  const { data: booking, error } = await ctx.supabase
    .from('spa_bookings')
    .insert({
      hotel_id: ctx.hotelId,
      reservation_id: body.reservationId,
      guest_id: body.guestId,
      service_id: body.serviceId,
      therapist_id: body.therapistId,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'booked',
      amount: service.price,
      payment_method: body.reservationId ? 'room_charge' : 'counter',
      notes: body.notes,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (body.reservationId) {
    const folio = await ensureOpenFolio(ctx.supabase, ctx.hotelId!, body.reservationId);
    const { error: postError } = await ctx.supabase.from('folio_items').insert({
      folio_id: folio.id,
      type: 'spa',
      description: `Spa: ${service.name}`,
      amount: service.price,
      quantity: 1,
      posted_by: ctx.user.id,
      reference_id: booking.id,
      reference_type: 'spa_booking',
    });
    if (postError) return NextResponse.json({ error: postError.message }, { status: 400 });
    await recalcFolio(ctx.supabase, folio.id);
  }

  return NextResponse.json({ ok: true, booking }, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']);
  if (ctx.error) return ctx.error;
  const body = await request.json();
  if (!body.id || !body.status) return NextResponse.json({ error: 'Missing id/status' }, { status: 422 });
  const { error } = await ctx.supabase
    .from('spa_bookings')
    .update({ status: body.status })
    .eq('id', body.id)
    .eq('hotel_id', ctx.hotelId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
