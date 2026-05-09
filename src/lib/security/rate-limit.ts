/**
 * Rate Limiting — Dual mode
 * 
 * PRODUCTION → Upstash Redis (survives Vercel cold starts)
 *   Setup: https://upstash.com → Create Redis → copy URL + Token
 *   ENV:   UPSTASH_REDIS_REST_URL=https://xxxx.upstash.io
 *          UPSTASH_REDIS_REST_TOKEN=AXxxxx
 *
 * DEVELOPMENT → In-memory Map (zero config)
 */

type Bucket = { count: number; resetAt: number };
const mem = new Map<string, Bucket>();

export type RateLimitResult = { allowed: boolean; limit: number; remaining: number; resetAt: number };

export function getClientIp(request: Request): string {
  const fwd = request.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
}

async function checkUpstash(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const url   = process.env.UPSTASH_REDIS_REST_URL!;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
  const winSec = Math.ceil(windowMs / 1000);
  const slot   = Math.floor(Date.now() / windowMs);
  const wKey   = `rl:${key}:${slot}`;

  const res  = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify([['INCR', wKey], ['EXPIRE', wKey, winSec]]),
  });
  const data = await res.json();
  const count = Number(data?.[0]?.result ?? 1);
  return {
    allowed:   count <= limit,
    limit,
    remaining: Math.max(0, limit - count),
    resetAt:   Date.now() + windowMs,
  };
}

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const cur = mem.get(key);
  if (!cur || cur.resetAt <= now) {
    mem.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, limit, remaining: limit - 1, resetAt: now + windowMs };
  }
  cur.count++;
  return { allowed: cur.count <= limit, limit, remaining: Math.max(0, limit - cur.count), resetAt: cur.resetAt };
}

export async function rateLimitCheck(key: string, limit = 60, windowMs = 60_000): Promise<RateLimitResult> {
  try {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      return await checkUpstash(key, limit, windowMs);
    }
  } catch { /* fail open */ }
  return checkMemory(key, limit, windowMs);
}

import { NextResponse } from 'next/server';


export function rateLimitHeaders(result: RateLimitResult): Record<string, string> {
  const retryAfter = Math.max(0, Math.ceil((result.resetAt - Date.now()) / 1000));
  return {
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
    ...(result.allowed ? {} : { 'Retry-After': String(retryAfter) }),
  };
}

export async function rateLimit(request: Request, key: string, limit = 60, windowMs = 60_000): Promise<NextResponse | null> {
  const ip     = getClientIp(request);
  const result = await rateLimitCheck(`${key}:${ip}`, limit, windowMs);
  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
    return NextResponse.json({ error: 'Too many requests', retryAfter }, {
      status: 429,
      headers: { 'Retry-After': String(retryAfter), 'X-RateLimit-Limit': String(limit), 'X-RateLimit-Remaining': '0' },
    });
  }
  return null;
}

export function requireProductionSecret(name: string) {
  if (process.env.NODE_ENV === 'production' && !process.env[name]) {
    return NextResponse.json({ error: `${name} is not configured` }, { status: 503 });
  }
  return null;
}
