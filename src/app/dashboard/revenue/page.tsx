import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RevenueManagerClient } from './revenue-manager-client';
import { format, subDays, subMonths } from 'date-fns';


export const dynamic = 'force-dynamic';
export default async function RevenueManagerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id,name').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const today = format(new Date(), 'yyyy-MM-dd');
  const d30   = format(subDays(new Date(), 30), 'yyyy-MM-dd');
  const m3    = format(subMonths(new Date(), 3), 'yyyy-MM-dd');

  const [
    { data: recentRes },
    { data: roomTypes },
    { data: rateCalendar },
    { data: targets },
  ] = await Promise.all([
    supabase.from('reservations')
      .select('check_in, check_out, total_amount, source, status, num_adults')
      .eq('hotel_id', hotel.id)
      .gte('check_in', d30).neq('status', 'cancelled'),

    supabase.from('room_types').select('id, name, base_rate, max_occupancy').eq('hotel_id', hotel.id),

    supabase.from('rate_calendar').select('date, rate, room_type_id')
      .eq('hotel_id', hotel.id).gte('date', today).lte('date', format(subDays(new Date(), -30), 'yyyy-MM-dd')),

    supabase.from('revenue_targets').select('*')
      .eq('hotel_id', hotel.id)
      .gte('year', new Date().getFullYear()).limit(12),
  ]);

  const { count: totalRooms } = await supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id);

  // Calculate metrics
  const revenue30d = recentRes?.reduce((s, r) => s + Number(r.total_amount || 0), 0) || 0;
  const bookings30d = recentRes?.length || 0;
  const adr = bookings30d > 0 ? revenue30d / bookings30d : 0;

  const occupiedToday = recentRes?.filter(r => r.check_in <= today && r.check_out > today).length || 0;
  const occupancy = totalRooms ? Math.round((occupiedToday / totalRooms) * 100) : 0;
  const revpar = totalRooms ? Math.round(revenue30d / 30 / totalRooms) : 0;

  return (
    <RevenueManagerClient
      hotelId={hotel.id}
      metrics={{ revenue30d, bookings30d, adr, occupancy, revpar, totalRooms: totalRooms || 0 }}
      reservations={recentRes || []}
      roomTypes={roomTypes || []}
      rateCalendar={rateCalendar || []}
      targets={targets || []}
    />
  );
}
