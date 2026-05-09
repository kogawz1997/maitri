import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { IoTClient } from './iot-client';


export const dynamic = 'force-dynamic';
export default async function IoTPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id,name').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const { data: devices } = await supabase
    .from('iot_devices').select('*, rooms(room_number, floor)')
    .eq('hotel_id', hotel.id).order('device_type');

  return <IoTClient hotelId={hotel.id} initialDevices={devices || []} />;
}
