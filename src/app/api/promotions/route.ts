import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const PromotionCreateSchema = z.object({
  hotelId: z.string().uuid(),
  code: z.string().trim().min(3).max(32),
  description: z.string().trim().max(240).optional().nullable(),
  discountType: z.enum(['percent', 'fixed', 'free_night']),
  discountValue: z.coerce.number().positive().max(1_000_000),
  minNights: z.coerce.number().int().min(1).max(90).optional().default(1),
  minAmount: z.coerce.number().nonnegative().max(10_000_000).optional().default(0),
  validFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  validUntil: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  maxUses: z.coerce.number().int().positive().max(1_000_000).optional().nullable(),
});

const PromotionPatchSchema = z.object({
  id: z.string().uuid(),
  hotelId: z.string().uuid(),
  description: z.string().trim().max(240).optional().nullable(),
  discount_type: z.enum(['percent', 'fixed', 'free_night']).optional(),
  discount_value: z.coerce.number().positive().max(1_000_000).optional(),
  min_nights: z.coerce.number().int().min(1).max(90).optional(),
  min_amount: z.coerce.number().nonnegative().max(10_000_000).optional(),
  valid_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  valid_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  max_uses: z.coerce.number().int().positive().max(1_000_000).optional().nullable(),
  active: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const hotelId = new URL(request.url).searchParams.get('hotelId') || '';
  const ctx = await requireHotelAccess(hotelId);
  if (ctx.error) return ctx.error;
  const { data } = await ctx.supabase.from('promo_codes').select('*').eq('hotel_id', hotelId).order('created_at', { ascending: false });
  return NextResponse.json({ promos: data || [] });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'promotions.create', 20, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, PromotionCreateSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;
  const { data, error } = await ctx.supabase.from('promo_codes').insert({
    hotel_id: body.hotelId,
    code: body.code.toUpperCase(),
    description: body.description,
    discount_type: body.discountType,
    discount_value: body.discountValue,
    min_nights: body.minNights,
    min_amount: body.minAmount,
    valid_from: body.validFrom || null,
    valid_until: body.validUntil || null,
    max_uses: body.maxUses || null,
    active: true,
  }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, promo: data });
}

export async function PATCH(request: NextRequest) {
  const limited = await rateLimit(request, 'promotions.update', 20, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, PromotionPatchSchema);
  if (parsed.error) return parsed.error;
  const { id, hotelId, ...updates } = parsed.data;

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;
  await ctx.supabase.from('promo_codes').update(updates).eq('id', id).eq('hotel_id', hotelId);
  return NextResponse.json({ success: true });
}
