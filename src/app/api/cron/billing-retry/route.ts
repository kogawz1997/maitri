import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { sendOpsAlert } from '@/lib/ops/alerts';

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request);
  if (err) return err;

  const admin = createAdminClient();
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, stripe_customer_id, subscription_status, suspended_at')
    .eq('subscription_status', 'past_due')
    .limit(200);

  let reminders = 0;
  for (const org of orgs || []) {
    await admin.from('audit_logs').insert({
      action: 'billing.retry.reminder',
      entity_type: 'organization',
      entity_id: org.id,
      changes: {
        stripe_customer_id: org.stripe_customer_id,
        subscription_status: org.subscription_status,
        suspended_at: org.suspended_at,
        suggested_action: 'confirm Stripe Smart Retry and notify account owner',
      },
    });

    await sendOpsAlert({
      level: 'warning',
      title: 'Billing retry follow-up required',
      message: `Organization ${org.id} is still past_due; follow up for payment retry.`,
      context: {
        organization_id: org.id,
        stripe_customer_id: org.stripe_customer_id,
        suspended_at: org.suspended_at,
      },
    });

    reminders += 1;
  }

  return NextResponse.json({ ok: true, reminders });
}
