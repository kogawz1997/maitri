import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FBMenuClient } from './fb-menu-client';


export const dynamic = 'force-dynamic';
export default async function FBMenuPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const { data: outlets } = await supabase.from('fb_outlets').select('*').eq('hotel_id', hotel.id).order('name');
  const { data: categories } = await supabase.from('fb_menu_categories')
    .select('*, fb_menu_items(*)')
    .in('outlet_id', outlets?.map(o => o.id) || [])
    .order('display_order');

  return <FBMenuClient hotelId={hotel.id} outlets={outlets || []} categories={categories || []} />;
}
