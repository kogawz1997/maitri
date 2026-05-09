import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const menuItemSchema = z.object({
  outletId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.coerce.number().min(0),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ctx = await requireHotelAccess(searchParams.get('hotelId'));
  if (ctx.error) return ctx.error;

  const { data: outlets } = await ctx.supabase
    .from('fb_outlets')
    .select('id,name,type,active')
    .eq('hotel_id', ctx.hotelId)
    .eq('active', true)
    .order('name');

  const outletIds = (outlets || []).map((outlet: any) => outlet.id);
  const { data: items, error } = outletIds.length
    ? await ctx.supabase
        .from('fb_menu_items')
        .select('id,outlet_id,category_id,name,description,price,available,tags')
        .in('outlet_id', outletIds)
        .eq('available', true)
        .order('name')
    : { data: [], error: null } as any;

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ outlets: outlets || [], items: items || [] });
}

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const parsed = menuItemSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const body = parsed.data;

  let outletId = body.outletId;
  if (!outletId) {
    const { data: outlet } = await ctx.supabase
      .from('fb_outlets')
      .select('id')
      .eq('hotel_id', ctx.hotelId)
      .eq('type', 'room_service')
      .maybeSingle();

    if (outlet) outletId = outlet.id;
    else {
      const { data: created, error } = await ctx.supabase
        .from('fb_outlets')
        .insert({ hotel_id: ctx.hotelId, name: 'Room Service', type: 'room_service', active: true })
        .select('id')
        .single();
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
      outletId = created.id;
    }
  }

  const { data, error } = await ctx.supabase
    .from('fb_menu_items')
    .insert({
      outlet_id: outletId,
      category_id: body.categoryId,
      name: body.name,
      description: body.description,
      price: body.price,
      available: true,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, item: data }, { status: 201 });
}
