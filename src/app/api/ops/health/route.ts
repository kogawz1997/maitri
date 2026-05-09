import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getClientIp, rateLimitCheck, rateLimitHeaders } from '@/lib/security/rate-limit';
import { classifyReliability } from '@/lib/reliability/metrics.js';

export const runtime = 'nodejs';

type Check = { ok: boolean; latencyMs?: number; message?: string };

async function timed(fn: () => Promise<void>): Promise<Check> {
  const start = Date.now();
  try {
    await fn();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (error: any) {
    return { ok: false, latencyMs: Date.now() - start, message: error?.message || 'failed' };
  }
}

export async function GET(request: Request) {
  const rl = await rateLimitCheck(`ops-health:${getClientIp(request)}`, 60);
  if (!rl.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429, headers: rateLimitHeaders(rl) });

  const admin = createAdminClient();
  const checks: Record<string, Check> = {};

  checks.database = await timed(async () => {
    const { error } = await admin.from('hotels').select('id').limit(1);
    if (error) throw new Error('Supabase database query failed');
  });

  checks.authConfig = {
    ok: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
    message: 'Supabase env configured',
  };

  checks.publicUrl = {
    ok: Boolean(process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://')),
    message: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ? 'HTTPS app URL configured' : 'NEXT_PUBLIC_APP_URL must be https:// for go-live',
  };

  checks.billingLive = {
    ok: Boolean(process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') && process.env.STRIPE_WEBHOOK_SECRET?.startsWith('whsec_')),
    message: process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'Stripe live key detected' : 'Stripe live key missing or still in test mode',
  };


  checks.reliability = await timed(async () => {
    const [{ data: queueRows, error: queueError }, { count: unresolvedDlq, error: dlqError }] = await Promise.all([
      admin.from('ota_sync_queue').select('status').in('status', ['retry', 'failed']),
      admin.from('dead_letter_queue').select('id', { count: 'exact', head: true }).is('resolved_at', null),
    ]);

    if (queueError) throw new Error(`queue check failed: ${queueError.message}`);
    if (dlqError) throw new Error(`dead letter queue check failed: ${dlqError.message}`);

    const queueStats = (queueRows || []).reduce((acc: Record<string, number>, row: { status: string }) => {
      acc[row.status] = Number(acc[row.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const reliability = classifyReliability(queueStats, unresolvedDlq || 0);
    if (!reliability.ok) throw new Error(reliability.message);
  });

  checks.tracing = {
    ok: Boolean(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    message: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
      ? 'Tracing DSN configured'
      : 'Tracing DSN missing (Sentry not configured)',
  };

  checks.backup = {
    ok: Boolean(process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF),
    message: process.env.SUPABASE_ACCESS_TOKEN && process.env.SUPABASE_PROJECT_REF
      ? 'Backup automation env ready'
      : 'Set SUPABASE_ACCESS_TOKEN + SUPABASE_PROJECT_REF for automated backups',
  };

  checks.alerts = {
    ok: Boolean(process.env.OPS_ALERT_WEBHOOK_URL || process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    message: 'Configure OPS_ALERT_WEBHOOK_URL or Sentry before taking real customers',
  };

  const ok = Object.values(checks).every(check => check.ok);

  return NextResponse.json({
    status: ok ? 'ok' : 'degraded',
    service: 'maitri-pms',
    generatedAt: new Date().toISOString(),
    checks,
  }, { status: 200, headers: { ...rateLimitHeaders(rl), 'Cache-Control': 'no-store' } });
}
