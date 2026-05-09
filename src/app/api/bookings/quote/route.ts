import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateNights } from '@/lib/utils';
import { parseJson, dateStringSchema } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  checkIn: dateStringSchema,
  checkOut: dateStringSchema,
  ratePlanId: z.string().uuid().optional().nullable(),
  promoCode: z.string().trim().max(32).optional().nullable(),
});


function isWeekendDate(dateIso: string) {
  const d = new Date(`${dateIso}T00:00:00.000Z`);
  const day = d.getUTCDay();
  return day === 0 || day === 6;
}


function seasonalMultiplier(dateIso: string) {
  const month = new Date(`${dateIso}T00:00:00.000Z`).getUTCMonth() + 1;
  const highMonths = (process.env.HIGH_SEASON_MONTHS || '12,1').split(',').map((m) => Number(m.trim())).filter(Boolean);
  const lowMonths = (process.env.LOW_SEASON_MONTHS || '5,9').split(',').map((m) => Number(m.trim())).filter(Boolean);
  const highMult = Number(process.env.HIGH_SEASON_MULTIPLIER || 1.2);
  const lowMult = Number(process.env.LOW_SEASON_MULTIPLIER || 0.9);
  if (highMonths.includes(month)) return highMult;
  if (lowMonths.includes(month)) return lowMult;
  return 1;
}


function bookingWindowMultiplier(checkIn: string) {
  const today = new Date();
  const ci = new Date(`${checkIn}T00:00:00.000Z`);
  const leadDays = Math.max(0, Math.ceil((ci.getTime() - today.getTime()) / 86_400_000));
  if (leadDays <= 3) return Number(process.env.LAST_MINUTE_MULTIPLIER || 1.12);
  if (leadDays <= 7) return Number(process.env.SHORT_WINDOW_MULTIPLIER || 1.06);
  return 1;
}

function withWeekdayWeekendRule(baseRate: number, dateIso: string) {
  const weekendMultiplier = Number(process.env.WEEKEND_RATE_MULTIPLIER || 1.1);
  const weekdayMultiplier = Number(process.env.WEEKDAY_RATE_MULTIPLIER || 1);
  const dayAdjusted = isWeekendDate(dateIso) ? baseRate * weekendMultiplier : baseRate * weekdayMultiplier;
  return dayAdjusted * seasonalMultiplier(dateIso);
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'bookings.quote', 30, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const { hotelId, roomTypeId, checkIn, checkOut, ratePlanId, promoCode } = parsed.data;

  const nights = calculateNights(checkIn, checkOut);
  if (nights < 1 || nights > 365) {
    return NextResponse.json({ error: 'Invalid stay dates' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, organization_id, organizations(subscription_status)')
    .eq('id', hotelId)
    .single();

  if (!hotel || hotel.organizations?.subscription_status === 'cancelled') {
    return NextResponse.json({ error: 'Hotel is not available for booking' }, { status: 404 });
  }

  const { data: roomType, error: roomTypeError } = await supabase
    .from('room_types')
    .select('id, hotel_id, base_rate')
    .eq('id', roomTypeId)
    .eq('hotel_id', hotelId)
    .single();

  if (roomTypeError || !roomType) return NextResponse.json({ error: 'Room type not found' }, { status: 404 });

  let rateQuery = supabase
    .from('rate_calendar')
    .select('date, rate, available_count, min_stay, closed_to_arrival, closed_to_departure')
    .eq('hotel_id', hotelId)
    .eq('room_type_id', roomTypeId)
    .gte('date', checkIn)
    .lt('date', checkOut)
    .order('date');

  if (ratePlanId) rateQuery = rateQuery.eq('rate_plan_id', ratePlanId);
  const { data: rates } = await rateQuery;

  let totalPrice = 0;
  let breakdown: Array<{ date: string; rate: number }> = [];

  if (rates && rates.length === nights) {
    const blocked = rates.find((r: any) => r.closed_to_arrival || r.closed_to_departure || Number(r.min_stay || 1) > nights);
    if (blocked) return NextResponse.json({ error: 'Selected dates are restricted', blockedDate: blocked.date }, { status: 409 });
    rates.forEach((r: any) => {
      const baseRate = Number(r.rate);
      const adjustedRate = withWeekdayWeekendRule(baseRate, r.date);
      totalPrice += adjustedRate;
      breakdown.push({ date: r.date, rate: adjustedRate });
    });
  } else {
    totalPrice = Number(roomType.base_rate || 0) * nights;
    const start = new Date(`${checkIn}T00:00:00.000Z`);
    breakdown = Array.from({ length: nights }).map((_, index) => {
      const d = new Date(start);
      d.setUTCDate(start.getUTCDate() + index);
      const date = d.toISOString().slice(0, 10);
      return { date, rate: withWeekdayWeekendRule(Number(roomType.base_rate || 0), date) };
    });
    totalPrice = breakdown.reduce((sum, item) => sum + item.rate, 0);
  }

  const dynamicMultiplier = bookingWindowMultiplier(checkIn);
  totalPrice = Math.round(totalPrice * dynamicMultiplier);

  let discountAmount = 0;
  let appliedPromo: null | { id: string; code: string } = null;
  if (promoCode) {
    const today = new Date().toISOString().slice(0, 10);
    const { data: promo } = await supabase
      .from('promo_codes')
      .select('id, code, valid_from, valid_until, max_uses, used_count, min_amount, discount_type, discount_value, active')
      .eq('hotel_id', hotelId)
      .eq('code', promoCode.toUpperCase())
      .eq('active', true)
      .maybeSingle();

    if (promo && (!promo.valid_from || promo.valid_from <= today) && (!promo.valid_until || promo.valid_until >= today)) {
      if (!promo.max_uses || Number(promo.used_count || 0) < Number(promo.max_uses || 0)) {
        if (!promo.min_amount || totalPrice >= Number(promo.min_amount || 0)) {
          if (promo.discount_type === 'percent') {
            discountAmount = Math.round(totalPrice * (Number(promo.discount_value || 0) / 100));
          } else {
            discountAmount = Math.min(Number(promo.discount_value || 0), totalPrice);
          }
          appliedPromo = { id: promo.id, code: promo.code };
          totalPrice = Math.max(0, totalPrice - discountAmount);
        }
      }
    }
  }

  const { data: existingResvs } = await supabase
    .from('reservations')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('room_type_id', roomTypeId)
    .lt('check_in', checkOut)
    .gt('check_out', checkIn)
    .not('status', 'in', '(cancelled,no_show)');

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id')
    .eq('hotel_id', hotelId)
    .eq('room_type_id', roomTypeId)
    .not('status', 'in', '(maintenance,blocked)');

  const available = Math.max(0, (rooms?.length || 0) - (existingResvs?.length || 0));

  const occupancyRatio = (rooms?.length || 0) > 0 ? (existingResvs?.length || 0) / (rooms?.length || 1) : 0;
  const occupancyMultiplier = occupancyRatio >= 0.85 ? 1.15 : occupancyRatio >= 0.65 ? 1.08 : 1;
  totalPrice = Math.round(totalPrice * occupancyMultiplier);

  return NextResponse.json({ nights, totalPrice, dynamicMultiplier, discountAmount, appliedPromo, occupancyMultiplier, occupancyRatio, pricePerNight: nights ? totalPrice / nights : 0, available, breakdown });
}
