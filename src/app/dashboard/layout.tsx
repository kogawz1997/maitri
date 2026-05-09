import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import { MobileDashboardHeader } from '@/components/layout/mobile-dashboard-header';


export const dynamic = 'force-dynamic';
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organizations(name)')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id || profile.active === false) {
    redirect('/onboarding');
  }

  const { data: hotels } = await supabase
    .from('hotels')
    .select('id, name, slug')
    .eq('organization_id', profile.organization_id)
    .limit(1);

  const hotel = hotels?.[0];
  if (!hotel) redirect('/onboarding');

  const [{ data: roomTypes }, { data: rooms }] = await Promise.all([
    supabase.from('room_types').select('id').eq('hotel_id', hotel.id).limit(1),
    supabase.from('rooms').select('id').eq('hotel_id', hotel.id).limit(1),
  ]);

  if (!profile.onboarding_completed || !roomTypes?.length || !rooms?.length) {
    redirect('/onboarding');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        hotelName={hotel.name || 'My Hotel'}
        hotelId={hotel.id}
        userName={profile?.full_name || undefined}
        userEmail={profile?.email || user.email || undefined}
        userRole={profile?.role}
      />
      <main className="flex-1 overflow-x-hidden pb-16 md:pb-0">
        <MobileDashboardHeader hotelName={hotel.name || 'My Hotel'} />
        {children}
      </main>
      <MobileNav userRole={profile?.role} />
    </div>
  );
}
