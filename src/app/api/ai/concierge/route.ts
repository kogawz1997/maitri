import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { detectLanguage, generateGuestReply } from '@/lib/ai';

const BodySchema = z.object({
  message: z.string().min(1),
  conversation_id: z.string().uuid().optional(),
  reservation_id: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']);
  if (ctx.error) return ctx.error;

  const parsed = BodySchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { data: kb } = await ctx.supabase
    .from('ai_concierge_knowledge')
    .select('title, content')
    .eq('hotel_id', ctx.hotelId)
    .eq('enabled', true)
    .limit(20);

  const lang = detectLanguage(parsed.data.message);
  const reply = await generateGuestReply({
    conversationHistory: [{ role: 'guest', text: parsed.data.message }],
    guestLanguage: lang,
    hotelInfo: {
      name: ctx.hotel?.name || 'our hotel',
      checkInTime: ctx.hotel?.check_in_time || '14:00',
      checkOutTime: ctx.hotel?.check_out_time || '12:00',
      address: ctx.hotel?.address || undefined,
    },
    knowledgeBase: kb || [],
  });

  await ctx.supabase.from('ai_concierge_logs').insert({
    hotel_id: ctx.hotelId,
    conversation_id: parsed.data.conversation_id || null,
    reservation_id: parsed.data.reservation_id || null,
    input: parsed.data.message,
    output: reply.reply,
    confidence: reply.confidence,
    needs_human: reply.needsHuman,
    created_by: ctx.user.id,
  });

  return NextResponse.json(reply);
}
