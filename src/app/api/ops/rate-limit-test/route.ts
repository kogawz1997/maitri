import { NextResponse } from 'next/server';
import { getClientIp, rateLimitCheck, rateLimitHeaders } from '@/lib/security/rate-limit';

export async function GET(request: Request) {
  const result = await rateLimitCheck(`rate-limit-test:${getClientIp(request)}`, 5, 60_000);
  if (!result.allowed) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(result) });
  }
  return NextResponse.json({ ok: true, remaining: result.remaining }, { headers: rateLimitHeaders(result) });
}
