import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { PromosClient } from './promos-client';


export const dynamic = 'force-dynamic';
export default async function PromosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');
  const { data: promos } = await supabase.from('promo_codes').select('*').eq('hotel_id', hotel.id).order('created_at', { ascending: false });
  return <PromosClient hotelId={hotel.id} promos={promos || []} />;
}
