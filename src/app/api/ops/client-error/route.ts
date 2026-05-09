import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { parseJson } from '@/lib/http/validation';

const schema = z.object({
  message: z.string().max(2000),
  digest: z.string().max(300).optional().nullable(),
  pathname: z.string().max(500).optional().nullable(),
  stack: z.string().max(8000).optional().nullable(),
});

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;

  const ctx = await requireHotelAccess(null);
  if (ctx.error) return ctx.error;

  await ctx.supabase.from('operational_events').insert({
    hotel_id: ctx.hotelId,
    event_type: 'client_error',
    severity: 'error',
    title: parsed.data.message,
    details: {
      digest: parsed.data.digest,
      pathname: parsed.data.pathname,
      stack: parsed.data.stack,
    },
    source: 'web',
  });

  return NextResponse.json({ ok: true });
}
