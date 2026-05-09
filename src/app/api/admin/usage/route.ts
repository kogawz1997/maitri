/**
 * Platform Admin — Usage Metrics
 * Per-organization usage stats for billing/monitoring
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { format, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (ctx.error) return ctx.error;

  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get('orgId');
  const admin = createAdminClient();

  const d30 = format(subDays(new Date(), 30), 'yyyy-MM-dd');

  if (orgId) {
    // Single org detailed usage
    const [
      { count: hotels },
      { count: rooms },
      { count: staff },
      { count: reservations30d },
      { data: aiUsage },
    ] = await Promise.all([
      admin.from('hotels').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
      admin.from('rooms').select('rooms.id', { count: 'exact', head: true })
        .eq('hotels.organization_id', orgId),
      admin.from('user_profiles').select('*', { count: 'exact', head: true }).eq('organization_id', orgId).eq('active', true),
      admin.from('reservations').select('*', { count: 'exact', head: true })
        .eq('organizations.id', orgId).gte('created_at', d30),
      admin.from('audit_logs').select('id, created_at')
        .eq('action', 'ai.suggest_reply').gte('created_at', d30).limit(1000),
    ]);

    return NextResponse.json({
      orgId,
      usage: {
        hotels: hotels || 0,
        rooms: rooms || 0,
        staff: staff || 0,
        reservations30d: reservations30d || 0,
        aiMessages30d: aiUsage?.length || 0,
      },
    });
  }

  // All orgs summary
  const { data: orgs } = await admin
    .from('organizations')
    .select('id, name, subscription_plan, subscription_status, created_at')
    .order('created_at', { ascending: false });

  const summary = {
    total: orgs?.length || 0,
    byPlan: {} as Record<string, number>,
    byStatus: {} as Record<string, number>,
    mrr: 0,
  };

  const planPrices: Record<string, number> = { starter: 0, standard: 2990, pro: 5990, enterprise: 0 };
  for (const org of orgs || []) {
    summary.byPlan[org.subscription_plan] = (summary.byPlan[org.subscription_plan] || 0) + 1;
    summary.byStatus[org.subscription_status] = (summary.byStatus[org.subscription_status] || 0) + 1;
    if (org.subscription_status === 'active') summary.mrr += planPrices[org.subscription_plan] || 0;
  }

  return NextResponse.json({ summary, orgs: orgs || [] });
}
