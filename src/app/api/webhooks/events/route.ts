import { createHmac, timingSafeEqual } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function verify(rawBody: string, signature: string | null) {
  const secret = process.env.WEBHOOK_SIGNING_SECRET;
  if (!secret || !signature) return false;
  const digest = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(signature, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const raw = await request.text();
  const signature = request.headers.get('x-maitri-signature');

  if (!verify(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(raw || '{}');
  const admin = createAdminClient();

  await admin.from('webhook_events').insert({
    source: payload.source || 'external',
    event_type: payload.type || 'unknown',
    payload,
    received_at: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
