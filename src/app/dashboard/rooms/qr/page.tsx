import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { RoomQRClient } from './room-qr-client';


export const dynamic = 'force-dynamic';
export default async function RoomQRPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const { data: profile } = await supabase
    .from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase
    .from('hotels').select('id, name, slug')
    .eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, floor, room_types(name)')
    .eq('hotel_id', hotel.id)
    .order('floor').order('room_number');

  return <RoomQRClient hotel={hotel} rooms={rooms || []} />;
}
