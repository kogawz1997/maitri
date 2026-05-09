import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/auth/guards';
import { forecastRevenue, predictOccupancy, pricingSuggestion, routeIntent, shouldEscalate, suggestedReply } from '@/lib/ai/assistant.js';

const assistSchema = z.object({
  message: z.string().max(2_000).optional().default(''),
  sentiment: z.enum(['positive', 'neutral', 'negative']).optional().default('neutral'),
  baseRevenue: z.coerce.number().finite().nonnegative().optional().default(0),
  growthRate: z.coerce.number().finite().min(-1).max(5).optional().default(0.05),
  periods: z.coerce.number().int().min(1).max(24).optional().default(3),
  currentOccupancy: z.coerce.number().finite().min(0).max(1).optional().default(0.6),
  leadDemand: z.coerce.number().finite().min(-1).max(1).optional().default(0.1),
  seasonality: z.coerce.number().finite().min(-1).max(1).optional().default(0),
  baseRate: z.coerce.number().finite().nonnegative().optional().default(1000),
});

export async function POST(request: Request) {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const raw = await request.json().catch(() => ({}));
  const parsed = assistSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const body = parsed.data;
  const intent = routeIntent(body.message);
  const escalate = shouldEscalate(intent, body.sentiment);

  return NextResponse.json({
    success: true,
    intentRouting: { intent },
    escalation: { required: escalate, queue: escalate ? 'human_support' : null },
    suggestedReplies: { text: suggestedReply(intent) },
    revenueForecasting: { nextPeriods: forecastRevenue({ baseRevenue: body.baseRevenue, growthRate: body.growthRate, periods: body.periods }) },
    occupancyPrediction: { predicted: predictOccupancy({ current: body.currentOccupancy, leadDemand: body.leadDemand, seasonality: body.seasonality }) },
    pricingAssistant: pricingSuggestion({ baseRate: body.baseRate, occupancy: body.currentOccupancy }),
  });
}
