import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PublicChatSchema = z.object({
  hotelId: z.string().uuid(),
  message: z.string().trim().min(1).max(1000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().max(1000),
  })).max(10).optional().default([]),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'public.chat', 20, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, PublicChatSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, message, history } = parsed.data;

  const supabase = createAdminClient();

  const [{ data: hotel }, { data: knowledge }] = await Promise.all([
    supabase.from('hotels').select('name, city, check_in_time, check_out_time, phone, email').eq('id', hotelId).single(),
    supabase.from('knowledge_base').select('question, answer').eq('hotel_id', hotelId).eq('active', true).limit(30),
  ]);

  const kb = (knowledge || []).map((k: any) => `Q: ${k.question}\nA: ${k.answer}`).join('\n\n');

  const systemPrompt = `คุณคือผู้ช่วยออนไลน์ของ ${hotel?.name || 'โรงแรม'} ตั้งอยู่ที่ ${hotel?.city || 'Thailand'}
เวลา Check-in: ${hotel?.check_in_time || '14:00'} | Check-out: ${hotel?.check_out_time || '12:00'}
${hotel?.phone ? `โทร: ${hotel.phone}` : ''} ${hotel?.email ? `| อีเมล: ${hotel.email}` : ''}

${kb ? `ข้อมูลเพิ่มเติม:\n${kb}` : ''}

กฎ:
- ตอบสั้น กระชับ เป็นมิตร ภาษาไทยเป็นหลัก แต่ถ้าแขกถามภาษาอังกฤษให้ตอบภาษาอังกฤษ
- ถ้าไม่รู้คำตอบ แนะนำให้โทรหาโรงแรมโดยตรง
- ห้ามให้ข้อมูลที่ไม่แน่ใจ`;

  const messages = [
    ...history.slice(-6).map((h) => ({ role: h.role, content: h.content })),
    { role: 'user' as const, content: message },
  ];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: systemPrompt,
      messages,
    });
    const reply = response.content[0].type === 'text' ? response.content[0].text : '';
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ reply: `ขออภัย ระบบขัดข้องชั่วคราว กรุณาโทรหาโรงแรมที่ ${hotel?.phone || 'หน้า Contact'}` });
  }
}
