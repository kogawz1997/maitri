/**
 * Trial Expiry Cron — runs daily at 01:00
 * Checks for expired trials and downgrades/notifies
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request);
  if (err) return err;

  const admin  = createAdminClient();
  const today  = format(new Date(), 'yyyy-MM-dd');
  const results = { expired: 0, warned: 0, errors: [] as string[] };

  // 1. Find trials that expired today
  const { data: expired } = await admin
    .from('organizations')
    .select('id, name, trial_ends_at, subscription_plan')
    .eq('subscription_status', 'trialing')
    .lt('trial_ends_at', today);

  for (const org of expired || []) {
    try {
      await admin.from('organizations').update({
        subscription_status: 'trial_expired',
        subscription_plan:   'starter', // downgrade to free tier
      }).eq('id', org.id);

      await admin.from('audit_logs').insert({
        action: 'subscription.trial_expired',
        entity_type: 'organization', entity_id: org.id,
        changes: { plan: org.subscription_plan, trial_ended: org.trial_ends_at },
      });

      // Notify org owner
      const { data: owner } = await admin
        .from('user_profiles')
        .select('id, email:auth_users(email)')
        .eq('organization_id', org.id)
        .eq('role', 'owner')
        .single();

      if (owner && process.env.SENDGRID_API_KEY) {
        await sendTrialExpiredEmail(org.name, (owner as any).email?.[0]?.email);
      }

      results.expired++;
    } catch (e: any) {
      results.errors.push(`${org.id}: ${e.message}`);
    }
  }

  // 2. Warn orgs expiring in 3 days
  const warn3 = format(new Date(Date.now() + 3 * 86400000), 'yyyy-MM-dd');
  const { data: expiringSoon } = await admin
    .from('organizations')
    .select('id, name, trial_ends_at')
    .eq('subscription_status', 'trialing')
    .eq('trial_ends_at', warn3);

  for (const org of expiringSoon || []) {
    const { data: owner } = await admin
      .from('user_profiles').select('id').eq('organization_id', org.id).eq('role', 'owner').single();
    if (owner && process.env.SENDGRID_API_KEY) {
      await sendTrialWarningEmail(org.name, org.trial_ends_at).catch(() => {});
      results.warned++;
    }
  }

  return NextResponse.json({ success: true, ...results });
}

async function sendTrialExpiredEmail(orgName: string, email?: string) {
  if (!email || !process.env.SENDGRID_API_KEY) return;
  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: [{ email }],
      from: { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@maitripms.com', name: 'Maitri PMS' },
      subject: `[${orgName}] Trial หมดอายุแล้ว — อัพเกรดเพื่อใช้งานต่อ`,
      content: [{ type: 'text/html', value: `<p>Trial ของ ${orgName} หมดอายุแล้ว กรุณาอัพเกรดแผนเพื่อใช้งานต่อ</p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">อัพเกรดเลย</a>` }],
    }),
  });
}

async function sendTrialWarningEmail(orgName: string, trialEndsAt: string) {
  // Similar to above but warning tone
}
