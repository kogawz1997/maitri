import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const RuleSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  trigger: z.enum(['checkin_minus_1_day', 'checkout_day', 'payment_overdue', 'booking_created', 'post_checkout_review']),
  channel: z.enum(['email', 'line', 'whatsapp', 'inbox']).default('inbox'),
  template_key: z.string().min(2),
  enabled: z.boolean().default(true),
  delay_minutes: z.number().int().min(0).max(10080).default(0),
});

export async function GET() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from('automation_rules')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const parsed = RuleSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from('automation_rules')
    .insert({ ...parsed.data, hotel_id: ctx.hotelId, created_by: ctx.user.id })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const body = await request.json();
  const parsed = RuleSchema.partial().extend({ id: z.string().uuid() }).safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { id, ...patch } = parsed.data;
  const { data, error } = await ctx.supabase
    .from('automation_rules')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('hotel_id', ctx.hotelId)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
