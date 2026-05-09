import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const serviceSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  durationMin: z.coerce.number().int().min(15).max(480),
  price: z.coerce.number().min(0),
  category: z.string().optional().nullable(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ctx = await requireHotelAccess(searchParams.get('hotelId'));
  if (ctx.error) return ctx.error;
  const [{ data: services, error }, { data: therapists }] = await Promise.all([
    ctx.supabase.from('spa_services').select('*').eq('hotel_id', ctx.hotelId).eq('active', true).order('name'),
    ctx.supabase.from('spa_therapists').select('*').eq('hotel_id', ctx.hotelId).eq('active', true).order('name'),
  ]);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ services: services || [], therapists: therapists || [] });
}

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;
  const parsed = serviceSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  const body = parsed.data;
  const { data, error } = await ctx.supabase
    .from('spa_services')
    .insert({ hotel_id: ctx.hotelId, name: body.name, description: body.description, duration_min: body.durationMin, price: body.price, category: body.category, active: true })
    .select('*')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, service: data }, { status: 201 });
}
