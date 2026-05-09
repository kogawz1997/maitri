import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const createOrderSchema = z.object({
  reservationId: z.string().uuid(),
  outletId: z.string().uuid().optional().nullable(),
  tableNumber: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    notes: z.string().optional().nullable(),
  })).min(1),
});

const patchOrderSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'preparing', 'served', 'paid', 'cancelled']),
  paymentMethod: z.enum(['room_charge', 'cash', 'card']).optional().default('room_charge'),
});

function orderNo() {
  return `FB-${Date.now().toString(36).toUpperCase()}`;
}

async function ensureOpenFolio(supabase: any, hotelId: string, reservationId: string) {
  const { data: folio } = await supabase
    .from('folios')
    .select('id,total_charges,total_payments,balance')
    .eq('hotel_id', hotelId)
    .eq('reservation_id', reservationId)
    .eq('status', 'open')
    .maybeSingle();

  if (folio) return folio;

  const { data: created, error } = await supabase
    .from('folios')
    .insert({ hotel_id: hotelId, reservation_id: reservationId, status: 'open' })
    .select('id,total_charges,total_payments,balance')
    .single();

  if (error) throw new Error(error.message);
  return created;
}

async function recalcFolio(supabase: any, folioId: string) {
  const { data: items } = await supabase
    .from('folio_items')
    .select('type,amount,quantity')
    .eq('folio_id', folioId);

  const totals = (items || []).reduce((acc: any, item: any) => {
    const amount = Number(item.amount || 0) * Number(item.quantity || 1);
    if (item.type === 'payment' || item.type === 'refund') acc.payments += amount;
    else acc.charges += amount;
    return acc;
  }, { charges: 0, payments: 0 });

  await supabase
    .from('folios')
    .update({
      total_charges: totals.charges,
      total_payments: totals.payments,
      balance: totals.charges - totals.payments,
    })
    .eq('id', folioId);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const ctx = await requireHotelAccess(searchParams.get('hotelId'));
  if (ctx.error) return ctx.error;

  let query = ctx.supabase
    .from('fb_orders')
    .select(`
      id, order_number, status, subtotal, service_charge, tax, total, payment_method,
      table_number, notes, created_at, reservation_id,
      reservations(reservation_code, rooms(room_number), guests(first_name,last_name)),
      fb_order_items(id, quantity, unit_price, amount, notes, fb_menu_items(name))
    `)
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (status) query = query.eq('status', status);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']);
  if (ctx.error) return ctx.error;

  const parsed = createOrderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const body = parsed.data;

  const { data: reservation, error: reservationError } = await ctx.supabase
    .from('reservations')
    .select('id, hotel_id, status')
    .eq('id', body.reservationId)
    .eq('hotel_id', ctx.hotelId)
    .single();

  if (reservationError || !reservation) return NextResponse.json({ error: 'Reservation not found in this hotel' }, { status: 404 });
  if (['cancelled', 'no_show', 'checked_out'].includes(reservation.status)) {
    return NextResponse.json({ error: 'Cannot post F&B order to inactive reservation' }, { status: 409 });
  }

  const itemIds = body.items.map(item => item.menuItemId);
  const { data: menuItems, error: menuError } = await ctx.supabase
    .from('fb_menu_items')
    .select('id, outlet_id, name, price, available')
    .in('id', itemIds);

  if (menuError) return NextResponse.json({ error: menuError.message }, { status: 400 });
  const menuById = new Map((menuItems || []).map((item: any) => [item.id, item]));
  const missing = itemIds.find(id => !menuById.has(id));
  if (missing) return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });

  const subtotal = body.items.reduce((sum, line) => {
    const menu = menuById.get(line.menuItemId) as any;
    if (!menu.available) throw new Error(`Menu item unavailable: ${menu.name}`);
    return sum + Number(menu.price || 0) * line.quantity;
  }, 0);
  const serviceCharge = Math.round(subtotal * 0.10 * 100) / 100;
  const tax = Math.round((subtotal + serviceCharge) * 0.07 * 100) / 100;
  const total = subtotal + serviceCharge + tax;
  const outletId = body.outletId || (menuById.get(body.items[0].menuItemId) as any)?.outlet_id || null;

  const { data: order, error: orderError } = await ctx.supabase
    .from('fb_orders')
    .insert({
      hotel_id: ctx.hotelId,
      outlet_id: outletId,
      reservation_id: body.reservationId,
      table_number: body.tableNumber,
      order_number: orderNo(),
      status: 'open',
      subtotal,
      service_charge: serviceCharge,
      tax,
      total,
      payment_method: 'room_charge',
      notes: body.notes,
    })
    .select('*')
    .single();

  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 400 });

  const lines = body.items.map(line => {
    const menu = menuById.get(line.menuItemId) as any;
    const unit = Number(menu.price || 0);
    return {
      order_id: order.id,
      menu_item_id: line.menuItemId,
      quantity: line.quantity,
      unit_price: unit,
      amount: unit * line.quantity,
      notes: line.notes,
    };
  });

  const { error: lineError } = await ctx.supabase.from('fb_order_items').insert(lines);
  if (lineError) return NextResponse.json({ error: lineError.message }, { status: 400 });

  return NextResponse.json({ ok: true, order }, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']);
  if (ctx.error) return ctx.error;

  const parsed = patchOrderSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const body = parsed.data;

  const { data: order, error: orderError } = await ctx.supabase
    .from('fb_orders')
    .select('id, hotel_id, reservation_id, order_number, status, total, payment_method')
    .eq('id', body.id)
    .eq('hotel_id', ctx.hotelId)
    .single();

  if (orderError || !order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.status === 'paid' && body.status !== 'paid') {
    return NextResponse.json({ error: 'Paid order cannot be moved backward' }, { status: 409 });
  }

  const { error: updateError } = await ctx.supabase
    .from('fb_orders')
    .update({ status: body.status, payment_method: body.paymentMethod })
    .eq('id', order.id);

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });

  if (body.status === 'paid' && body.paymentMethod === 'room_charge') {
    const folio = await ensureOpenFolio(ctx.supabase, ctx.hotelId!, order.reservation_id);
    const { data: existing } = await ctx.supabase
      .from('folio_items')
      .select('id')
      .eq('folio_id', folio.id)
      .eq('reference_id', order.id)
      .eq('reference_type', 'fb_order')
      .maybeSingle();

    if (!existing) {
      const { error: postError } = await ctx.supabase.from('folio_items').insert({
        folio_id: folio.id,
        type: 'fb',
        description: `F&B order ${order.order_number}`,
        amount: order.total,
        quantity: 1,
        posted_by: ctx.user.id,
        reference_id: order.id,
        reference_type: 'fb_order',
      });
      if (postError) return NextResponse.json({ error: postError.message }, { status: 400 });
      await recalcFolio(ctx.supabase, folio.id);
    }
  }

  return NextResponse.json({ ok: true });
}
