import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { MaintenanceClient } from './maintenance-client';


export const dynamic = 'force-dynamic';
export default async function MaintenancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id, role').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const [{ data: requests }, { data: rooms }, { data: staff }] = await Promise.all([
    supabase.from('maintenance_requests').select('*, rooms(room_number, floor), reported_by_profile:user_profiles!reported_by(full_name), assigned_to_profile:user_profiles!assigned_to(full_name)')
      .eq('hotel_id', hotel.id).order('created_at', { ascending: false }).limit(100),
    supabase.from('rooms').select('id, room_number, floor').eq('hotel_id', hotel.id).order('room_number'),
    supabase.from('user_profiles').select('id, full_name').eq('organization_id', profile?.organization_id).eq('active', true),
  ]);

  return <MaintenanceClient hotelId={hotel.id} userId={user.id} requests={requests || []} rooms={rooms || []} staff={staff || []} />;
}
