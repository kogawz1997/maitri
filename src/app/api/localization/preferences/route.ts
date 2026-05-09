import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const BodySchema = z.object({
  default_locale: z.enum(['th', 'en', 'zh', 'ja', 'ko']),
  enabled_locales: z.array(z.enum(['th', 'en', 'zh', 'ja', 'ko'])).min(1),
  auto_detect_guest_language: z.boolean().default(true),
});

export async function GET() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from('hotel_localization_settings')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || { default_locale: 'th', enabled_locales: ['th', 'en'], auto_detect_guest_language: true });
}

export async function PATCH(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data, error } = await ctx.supabase
    .from('hotel_localization_settings')
    .upsert({ hotel_id: ctx.hotelId, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: 'hotel_id' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
