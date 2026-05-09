import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { sendOpsAlert } from '@/lib/ops/alerts';
import { parseJson } from '@/lib/http/validation';
import { getClientIp, rateLimitCheck, rateLimitHeaders } from '@/lib/security/rate-limit';

export const runtime = 'nodejs';

const OpsAlertSchema = z.object({
  level: z.enum(['info', 'warning', 'critical']).optional().default('info'),
  title: z.string().trim().min(1).max(160).optional().default('Maitri PMS test alert'),
  message: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  const rl = await rateLimitCheck(`ops-alert:${getClientIp(request)}`, 20);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) });

  const ctx = await requireHotelAccess(null, ['owner', 'admin']);
  if (ctx.error) return ctx.error;

  const parsed = await parseJson(request, OpsAlertSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;
  const message = body.message || `Test alert from ${ctx.hotel?.name || 'hotel'}`;

  const result = await sendOpsAlert({
    level: body.level,
    title: body.title,
    message,
    context: { hotelId: ctx.hotelId, userId: ctx.user?.id, source: 'manual-test' },
  });

  await ctx.supabase.from('operational_events').insert({
    hotel_id: ctx.hotelId,
    event_type: 'ops.alert.test',
    severity: body.level,
    title: body.title,
    details: { message, result },
    source: 'p7-go-live',
  });

  return NextResponse.json({ ok: true, result }, { headers: rateLimitHeaders(rl) });
}
