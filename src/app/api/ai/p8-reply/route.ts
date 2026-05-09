import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { detectGuestIntent, fallbackReply } from '@/lib/ai/intent';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
const schema = z.object({ message: z.string().min(1), conversationId: z.string().uuid().optional(), locale: z.string().optional() });
export async function POST(request: Request) {
  const limited = await rateLimit(request, 'ai.p8-reply', 60, 60_000); if (limited) return limited;
  const parsed = await parseJson(request, schema); if (parsed.error) return parsed.error;
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']); if (ctx.error) return ctx.error;
  const { intent, confidence } = detectGuestIntent(parsed.data.message);
  const reply = fallbackReply(intent, parsed.data.locale || 'en');
  const needsHuman = intent === 'complaint' || confidence < 0.6;
  await ctx.supabase.from('ai_concierge_logs').insert({ hotel_id: ctx.hotelId, conversation_id: parsed.data.conversationId || null, input: parsed.data.message, output: reply, confidence, needs_human: needsHuman, intent, metadata: { source: 'p8-reply' }, created_by: ctx.user.id });
  return NextResponse.json({ intent, reply, confidence, needsHuman });
}
