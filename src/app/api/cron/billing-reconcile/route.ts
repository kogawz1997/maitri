import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/guards';
import { stripeRequest } from '@/lib/billing/stripe';
import { createAdminClient } from '@/lib/supabase/server';

type StripeSubscription = {
  id: string;
  status: string;
};

function normalizeStatus(status: string) {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'canceled' || status === 'cancelled' || status === 'incomplete_expired') return 'cancelled';
  if (status === 'past_due' || status === 'unpaid') return 'past_due';
  return 'past_due';
}

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request);
  if (err) return err;

  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, stripe_subscription_id, subscription_status')
    .in('subscription_status', ['past_due', 'active'])
    .not('stripe_subscription_id', 'is', null)
    .limit(200);

  let checked = 0;
  let updated = 0;
  const failures: Array<{ organization_id: string; error: string }> = [];

  for (const org of orgs || []) {
    if (!org.stripe_subscription_id) continue;
    checked += 1;
    try {
      const sub = await stripeRequest<StripeSubscription>(`/subscriptions/${org.stripe_subscription_id}`);
      const nextStatus = normalizeStatus(sub.status);
      if (nextStatus !== org.subscription_status) {
        updated += 1;
        await admin
          .from('organizations')
          .update({
            subscription_status: nextStatus,
            suspended_at: nextStatus === 'past_due' || nextStatus === 'cancelled' ? new Date().toISOString() : null,
            suspension_reason: nextStatus === 'past_due' ? 'stripe_reconcile_past_due' : nextStatus === 'cancelled' ? 'stripe_reconcile_cancelled' : null,
          })
          .eq('id', org.id);

        await admin.from('audit_logs').insert({
          action: 'billing.reconcile.status_sync',
          entity_type: 'organization',
          entity_id: org.id,
          changes: { from: org.subscription_status, to: nextStatus, stripe_subscription_id: org.stripe_subscription_id },
        });
      }
    } catch (error) {
      failures.push({ organization_id: org.id, error: error instanceof Error ? error.message : 'unknown_error' });
    }
  }

  return NextResponse.json({ ok: true, checked, updated, failed: failures.length, failures });
}
