import { createAdminClient } from '@/lib/supabase/server';
import { AdminPanelClient } from './admin-panel-client';
import { format, subDays } from 'date-fns';


export const dynamic = 'force-dynamic';
export default async function AdminPanelPage() {
  const admin = createAdminClient();

  const [
    { data: orgs },
    { count: totalOrgs },
    { count: totalHotels },
    { data: recentSignups },
  ] = await Promise.all([
    admin.from('organizations').select(`
      id, name, subscription_plan, subscription_status, trial_ends_at,
      created_at, stripe_customer_id,
      hotels(count),
      user_profiles(count)
    `).order('created_at', { ascending: false }).limit(50),

    admin.from('organizations').select('*', { count: 'exact', head: true }),
    admin.from('hotels').select('*', { count: 'exact', head: true }),

    admin.from('organizations').select('id, name, subscription_plan, created_at')
      .gte('created_at', format(subDays(new Date(), 30), 'yyyy-MM-dd'))
      .order('created_at', { ascending: false }),
  ]);

  // MRR calculation
  const planPrices: Record<string, number> = { starter: 1490, standard: 2990, pro: 5990, enterprise: 0 };
  const mrr = (orgs || []).filter(o => o.subscription_status === 'active').reduce((s, o) => s + (planPrices[o.subscription_plan] || 0), 0);

  return (
    <AdminPanelClient
      orgs={orgs || []}
      stats={{ totalOrgs: totalOrgs || 0, totalHotels: totalHotels || 0, mrr, newThisMonth: recentSignups?.length || 0 }}
    />
  );
}
