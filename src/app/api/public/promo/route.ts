import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const PublicPromoSchema = z.object({
  hotelId: z.string().uuid(),
  code: z.string().trim().min(2).max(32),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  roomTypeId: z.string().uuid().optional().nullable(),
  amount: z.coerce.number().nonnegative().max(10_000_000).default(0),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'public.promo', 60, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, PublicPromoSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, code, roomTypeId, amount } = parsed.data;

  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: promo } = await admin
    .from('promo_codes')
    .select('*')
    .eq('hotel_id', hotelId)
    .eq('code', code.toUpperCase())
    .eq('active', true)
    .single();

  if (!promo) return NextResponse.json({ valid: false, error: 'โค้ดไม่ถูกต้องหรือหมดอายุ' });

  // Validate dates
  if (promo.valid_from && promo.valid_from > today)
    return NextResponse.json({ valid: false, error: 'โค้ดยังไม่เริ่มใช้งาน' });
  if (promo.valid_until && promo.valid_until < today)
    return NextResponse.json({ valid: false, error: 'โค้ดหมดอายุแล้ว' });

  // Validate max uses
  if (promo.max_uses && promo.used_count >= promo.max_uses)
    return NextResponse.json({ valid: false, error: 'โค้ดถูกใช้ครบแล้ว' });

  // Validate min amount
  if (promo.min_amount && amount < promo.min_amount)
    return NextResponse.json({ valid: false, error: `ต้องจองขั้นต่ำ ฿${promo.min_amount.toLocaleString()}` });

  // Validate room type
  if (promo.applies_to === 'specific_room_types' && roomTypeId &&
      promo.room_type_ids && !promo.room_type_ids.includes(roomTypeId))
    return NextResponse.json({ valid: false, error: 'โค้ดนี้ใช้ไม่ได้กับห้องประเภทนี้' });

  // Calculate discount
  let discountAmount = 0;
  if (promo.discount_type === 'percent') {
    discountAmount = Math.round(amount * (promo.discount_value / 100));
  } else if (promo.discount_type === 'fixed') {
    discountAmount = Math.min(promo.discount_value, amount);
  }

  return NextResponse.json({
    valid: true,
    promoId: promo.id,
    code: promo.code,
    description: promo.description,
    discountType: promo.discount_type,
    discountValue: promo.discount_value,
    discountAmount,
    finalAmount: Math.max(0, amount - discountAmount),
  });
}
