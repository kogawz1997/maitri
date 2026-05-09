import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type Check = { ok: boolean; message: string; latencyMs?: number };

async function timed(name: string, fn: () => Promise<void>): Promise<[string, Check]> {
  const t0 = Date.now();
  try {
    await fn();
    return [name, { ok: true, message: 'ok', latencyMs: Date.now() - t0 }];
  } catch (error: any) {
    return [name, { ok: false, message: error?.message || 'failed', latencyMs: Date.now() - t0 }];
  }
}

export async function GET() {
  const admin = createAdminClient();
  const requiredEnv = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'NEXT_PUBLIC_APP_URL',
    'CRON_SECRET',
  ];
  const commercialEnv = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
  const optionalEnv = ['ANTHROPIC_API_KEY', 'SENTRY_DSN', 'NEXT_PUBLIC_SENTRY_DSN'];

  const checks = Object.fromEntries(await Promise.all([
    timed('database', async () => {
      const { error } = await admin.from('hotels').select('id').limit(1);
      if (error) throw new Error('database query failed');
    }),
    timed('operational_events', async () => {
      const { error } = await admin.from('operational_events').select('id').limit(1);
      if (error) throw new Error('operational_events missing or inaccessible');
    }),
    timed('billing_tables', async () => {
      const { error } = await admin.from('subscription_events').select('id').limit(1);
      if (error) throw new Error('subscription_events missing or inaccessible');
    }),
    timed('automation_tables', async () => {
      const { error } = await admin.from('automation_rules').select('id').limit(1);
      if (error) throw new Error('automation_rules missing or inaccessible');
    }),
  ]));

  checks.environment = {
    ok: requiredEnv.every(k => !!process.env[k]),
    message: requiredEnv.filter(k => !process.env[k]).length
      ? `missing required env: ${requiredEnv.filter(k => !process.env[k]).join(', ')}`
      : 'ok',
  };
  checks.commercial = {
    ok: commercialEnv.every(k => !!process.env[k]),
    message: commercialEnv.filter(k => !process.env[k]).length
      ? `missing billing env: ${commercialEnv.filter(k => !process.env[k]).join(', ')}`
      : 'ok',
  };
  checks.optional = {
    ok: true,
    message: `optional configured: ${optionalEnv.filter(k => !!process.env[k]).join(', ') || 'none'}`,
  };

  const ok = Object.values(checks).every((c: any) => c.ok);
  return NextResponse.json({
    status: ok ? 'ready' : 'blocked',
    generatedAt: new Date().toISOString(),
    checks,
  }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
}
