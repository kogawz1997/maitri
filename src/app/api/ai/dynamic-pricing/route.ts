/**
 * AI Dynamic Pricing Engine
 * Analyzes demand signals and suggests optimal room rates
 *
 * Factors:
 * - Historical occupancy by day-of-week
 * - Current booking pace vs same period last year
 * - Local events / holidays
 * - Competitor signal (future: OTA scrape)
 * - Lead time (days until check-in)
 * - Length of stay patterns
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { checkFeatureGate } from '@/lib/billing/feature-gate';
import { createAdminClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
import Anthropic from '@anthropic-ai/sdk';
import { format, addDays, subDays, eachDayOfInterval } from 'date-fns';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PricingSuggestionRequestSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  daysAhead: z.coerce.number().int().min(1).max(365).optional().default(60),
});

const ApplyPricingSuggestionsSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid(),
  suggestions: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    suggested_rate: z.coerce.number().positive().max(10_000_000),
  })).min(1).max(365),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'ai.dynamic-pricing.suggest', 10, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, PricingSuggestionRequestSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, roomTypeId, daysAhead } = parsed.data;

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const gate = await checkFeatureGate(ctx.profile.organization_id, 'dynamic_pricing');
  if (!gate.allowed) return NextResponse.json({ error: gate.reason, upgrade: gate.upgrade }, { status: 402 });

  const admin = createAdminClient();
  const today = new Date();

  // Gather data
  const [{ data: roomType }, { data: reservations }, { data: rateCalendar }] = await Promise.all([
    admin.from('room_types').select('name, base_rate, max_occupancy').eq('id', roomTypeId).single(),
    admin.from('reservations')
      .select('check_in, check_out, total_amount, source, created_at')
      .eq('hotel_id', hotelId)
      .gte('check_in', format(subDays(today, 365), 'yyyy-MM-dd'))
      .lte('check_in', format(addDays(today, daysAhead), 'yyyy-MM-dd'))
      .neq('status', 'cancelled'),
    admin.from('rate_calendar')
      .select('date, rate')
      .eq('hotel_id', hotelId)
      .eq('room_type_id', roomTypeId)
      .gte('date', format(today, 'yyyy-MM-dd'))
      .lte('date', format(addDays(today, daysAhead), 'yyyy-MM-dd')),
  ]);

  // Calculate occupancy by day-of-week (last 90 days)
  const dowOccupancy: Record<number, { total: number; booked: number }> = {};
  for (let dow = 0; dow < 7; dow++) dowOccupancy[dow] = { total: 0, booked: 0 };

  const last90 = eachDayOfInterval({ start: subDays(today, 90), end: subDays(today, 1) });
  last90.forEach(day => {
    const dow = day.getDay();
    const dateStr = format(day, 'yyyy-MM-dd');
    dowOccupancy[dow].total++;
    const isBooked = reservations?.some(r => r.check_in <= dateStr && r.check_out > dateStr);
    if (isBooked) dowOccupancy[dow].booked++;
  });

  // Current booking pace: bookings made in last 30 days for next 60 days
  const recentBookings = reservations?.filter(r => {
    const created = new Date(r.created_at);
    return created >= subDays(today, 30) && new Date(r.check_in) >= today;
  }) || [];

  const overriddenDates = new Set((rateCalendar || []).map((row: any) => row.date));

  // Build context for AI
  const dowNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dowStats = Object.entries(dowOccupancy).map(([dow, stats]) => ({
    day: dowNames[Number(dow)],
    occupancyPct: stats.total > 0 ? Math.round((stats.booked / stats.total) * 100) : 0,
  }));

  const prompt = `You are a hotel revenue management AI for "${roomType?.name}" at a Thai hotel.

Base rate: ${roomType?.base_rate} THB/night
Existing future calendar overrides: ${overriddenDates.size} dates
Recent booking pace: ${recentBookings.length} bookings in last 30 days for upcoming 60 days
Historical occupancy by day:
${dowStats.map(d => `  ${d.day}: ${d.occupancyPct}%`).join('\n')}

Analyze demand and suggest pricing for the next ${daysAhead} days. Consider:
1. Weekend vs weekday patterns
2. Lead time (bookings made close to arrival = can charge more if high demand, less if low)
3. Thai holidays and long weekends
4. Revenue optimization: don't leave money on the table but don't price out guests

Respond ONLY with a JSON array of pricing suggestions (no markdown, no explanation):
[
  {
    "date": "YYYY-MM-DD",
    "suggested_rate": number,
    "reason": "short reason max 10 words",
    "confidence": "low|medium|high"
  }
]
Only include dates where you suggest a DIFFERENT rate from base (skip dates where base rate is optimal).
Maximum 30 suggestions for the most impactful dates.`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    let suggestions: any[] = [];
    try {
      suggestions = JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      suggestions = [];
    }

    return NextResponse.json({
      roomTypeName: roomType?.name,
      baseRate: roomType?.base_rate,
      suggestions,
      stats: { dowStats, recentBookingPace: recentBookings.length, existingOverrides: overriddenDates.size },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Apply AI suggestions to rate_calendar
export async function PUT(request: NextRequest) {
  const limited = await rateLimit(request, 'ai.dynamic-pricing.apply', 10, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, ApplyPricingSuggestionsSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, roomTypeId, suggestions } = parsed.data;

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const gate = await checkFeatureGate(ctx.profile.organization_id, 'dynamic_pricing');
  if (!gate.allowed) return NextResponse.json({ error: gate.reason, upgrade: gate.upgrade }, { status: 402 });

  const admin = createAdminClient();
  const rows = suggestions.map((s) => ({
    hotel_id: hotelId,
    room_type_id: roomTypeId,
    date: s.date,
    rate: Math.round(s.suggested_rate),
    min_stay: 1,
  }));

  const { error } = await admin.from('rate_calendar')
    .upsert(rows, { onConflict: 'hotel_id,room_type_id,date', ignoreDuplicates: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, applied: rows.length });
}
