import { createClient } from '@/lib/supabase/server';
import { bootstrapOwnerAccount } from '@/lib/auth/onboarding';
import { redirect } from 'next/navigation';
import { OnboardingClient } from './onboarding-client';


export const dynamic = 'force-dynamic';
export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  let { data: profile } = await supabase
    .from('user_profiles')
    .select('*, organizations(id, name)')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.organization_id && user.email) {
    await bootstrapOwnerAccount({
      userId: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name,
      hotelName: user.user_metadata?.hotel_name,
    });

    const refreshed = await supabase
      .from('user_profiles')
      .select('*, organizations(id, name)')
      .eq('id', user.id)
      .maybeSingle();
    profile = refreshed.data;
  }

  if (!profile?.organization_id) redirect('/auth/login?error=onboarding_bootstrap_failed');

  const { data: hotels } = await supabase
    .from('hotels')
    .select('*')
    .eq('organization_id', profile.organization_id)
    .limit(1);
  const hotel = hotels?.[0];

  const { data: roomTypes } = hotel
    ? await supabase.from('room_types').select('id').eq('hotel_id', hotel.id).limit(1)
    : { data: [] };

  const { data: rooms } = hotel
    ? await supabase.from('rooms').select('id').eq('hotel_id', hotel.id).limit(1)
    : { data: [] };

  if (hotel && (roomTypes?.length || 0) > 0 && (rooms?.length || 0) > 0 && profile.onboarding_completed) {
    redirect('/dashboard');
  }

  return (
    <OnboardingClient
      user={{ id: user.id, email: user.email || '' }}
      organizationId={profile.organization_id}
      existingHotel={hotel || null}
      hasRoomTypes={(roomTypes?.length || 0) > 0}
    />
  );
}
