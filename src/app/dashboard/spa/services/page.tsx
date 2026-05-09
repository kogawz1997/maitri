import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SpaServicesClient } from './spa-services-client';


export const dynamic = 'force-dynamic';
export default async function SpaServicesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const [{ data: services }, { data: therapists }] = await Promise.all([
    supabase.from('spa_services').select('*').eq('hotel_id', hotel.id).order('category').order('name'),
    supabase.from('spa_therapists').select('*').eq('hotel_id', hotel.id).eq('active', true),
  ]);

  return <SpaServicesClient hotelId={hotel.id} services={services || []} therapists={therapists || []} />;
}
