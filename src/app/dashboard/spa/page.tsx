import { createClient } from '@/lib/supabase/server';
import { TopBar } from '@/components/layout/top-bar';
import { SpaBookingClient } from '@/components/dashboard/spa-booking-client';


export const dynamic = 'force-dynamic';
export default async function SpaPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user!.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();

  const { data: reservations } = hotel ? await supabase
    .from('reservations')
    .select('id,reservation_code,status,guests(first_name,last_name),rooms(room_number)')
    .eq('hotel_id', hotel.id)
    .in('status', ['confirmed', 'checked_in'])
    .order('check_in', { ascending: false })
    .limit(50) : { data: [] } as any;

  return (
    <div className="container max-w-7xl py-8 animate-fade-in">
      <TopBar title="Spa & Wellness" description="บริการสปา ตารางจอง และ charge เข้า folio แขก" />
      <SpaBookingClient reservations={reservations || []} />
    </div>
  );
}
