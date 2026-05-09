import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DynamicPricingClient } from './dynamic-pricing-client';


export const dynamic = 'force-dynamic';
export default async function DynamicPricingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id,name').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');
  const { data: roomTypes } = await supabase.from('room_types').select('id,name,base_rate').eq('hotel_id', hotel.id);
  return <DynamicPricingClient hotelId={hotel.id} hotelName={hotel.name} roomTypes={roomTypes || []} />;
}
