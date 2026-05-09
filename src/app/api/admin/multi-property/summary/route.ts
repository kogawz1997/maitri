import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const [{ count: orgCount, error: orgError }, { count: hotelCount, error: hotelError }, { data: topOrgs, error: topError }, { count: sharedGuests, error: guestError }] = await Promise.all([
    auth.supabase.from('organizations').select('id', { count: 'exact', head: true }),
    auth.supabase.from('hotels').select('id', { count: 'exact', head: true }),
    auth.supabase
      .from('organizations')
      .select('id,name,hotels(count),subscriptions(status,plan)')
      .order('created_at', { ascending: false })
      .limit(10),
    auth.supabase.from('guest_identity_map').select('id', { count: 'exact', head: true }),
  ]);

  if (orgError || hotelError || topError || guestError) {
    return NextResponse.json({ error: orgError?.message || hotelError?.message || topError?.message || guestError?.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    summary: {
      organizations: orgCount || 0,
      hotels: hotelCount || 0,
      sharedGuestProfiles: sharedGuests || 0,
    },
    topOrganizations: topOrgs || [],
    generatedAt: new Date().toISOString(),
  });
}
