import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SpaBookingsClient } from './spa-bookings-client';
import { format, startOfWeek, endOfWeek } from 'date-fns';


export const dynamic = 'force-dynamic';
export default async function SpaBookingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const weekEnd   = format(endOfWeek(new Date(),   { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const [{ data: bookings }, { data: services }, { data: therapists }, { data: guests }] = await Promise.all([
    supabase.from('spa_bookings').select('*, spa_services(name,duration_min,price), spa_therapists(name), guests(first_name,last_name)')
      .eq('hotel_id', hotel.id).gte('start_time', weekStart).lte('start_time', weekEnd + 'T23:59:59')
      .order('start_time'),
    supabase.from('spa_services').select('id,name,duration_min,price').eq('hotel_id', hotel.id).eq('active', true),
    supabase.from('spa_therapists').select('id,name').eq('hotel_id', hotel.id).eq('active', true),
    supabase.from('guests').select('id,first_name,last_name').eq('hotel_id', hotel.id).order('first_name').limit(200),
  ]);

  return <SpaBookingsClient hotelId={hotel.id} bookings={bookings || []} services={services || []} therapists={therapists || []} guests={guests || []} />;
}
