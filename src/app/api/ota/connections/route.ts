import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const ConnectionSchema = z.object({
  id: z.string().uuid().optional(),
  provider: z.enum(['booking_com', 'agoda', 'expedia', 'airbnb', 'direct']),
  external_property_id: z.string().min(1),
  status: z.enum(['draft', 'active', 'paused', 'error']).default('draft'),
  sync_rates: z.boolean().default(true),
  sync_inventory: z.boolean().default(true),
  sync_reservations: z.boolean().default(true),
});

export async function GET() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from('ota_connections')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const parsed = ConnectionSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from('ota_connections')
    .insert({ ...parsed.data, hotel_id: ctx.hotelId, created_by: ctx.user.id })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const parsed = ConnectionSchema.partial().extend({ id: z.string().uuid() }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, ...patch } = parsed.data;
  const { data, error } = await ctx.supabase
    .from('ota_connections')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
