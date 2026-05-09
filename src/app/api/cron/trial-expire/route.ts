import { NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';

async function run(request: Request) {
  const denied = requireCronSecret(request);
  if (denied) return denied;

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const inThreeDays = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

  const { data: expiring } = await supabase
    .from('organizations')
    .select('id, name, trial_ends_at, owner_email')
    .eq('subscription_status', 'trial')
    .gt('trial_ends_at', now)
    .lte('trial_ends_at', inThreeDays)
    .limit(200);

  const { data: expired, error } = await supabase
    .from('organizations')
    .update({
      subscription_status: 'past_due',
      suspended_at: now,
      suspension_reason: 'trial_expired',
    })
    .eq('subscription_status', 'trial')
    .lte('trial_ends_at', now)
    .select('id, name, trial_ends_at');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  for (const org of expired || []) {
    await supabase.from('subscription_events').insert({
      organization_id: org.id,
      event_type: 'trial.expired',
      status: 'past_due',
      payload: { trial_ends_at: org.trial_ends_at, processed_at: now },
    });
    await supabase.from('audit_logs').insert({
      action: 'billing.trial.expired',
      entity_type: 'organization',
      entity_id: org.id,
      changes: { processed_at: now },
    });
  }

  for (const org of expiring || []) {
    await supabase.from('subscription_events').insert({
      organization_id: org.id,
      event_type: 'trial.expiring_soon',
      status: 'trial',
      payload: { trial_ends_at: org.trial_ends_at, notify: true },
    });
  }

  return NextResponse.json({ ok: true, expired: expired?.length || 0, expiringSoon: expiring?.length || 0 });
}

export async function GET(request: Request) { return run(request); }
export async function POST(request: Request) { return run(request); }
