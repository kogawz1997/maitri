import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FBOrdersClient } from './fb-orders-client';


export const dynamic = 'force-dynamic';
export default async function FBOrdersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase.from('user_profiles').select('organization_id').eq('id', user.id).single();
  const { data: hotel } = await supabase.from('hotels').select('id').eq('organization_id', profile?.organization_id).limit(1).single();
  if (!hotel) redirect('/onboarding');

  const { data: orders } = await supabase
    .from('fb_orders')
    .select('*, fb_outlets(name), fb_order_items(*, fb_menu_items(name, price))')
    .eq('hotel_id', hotel.id)
    .not('status', 'in', '("paid","cancelled")')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: outlets } = await supabase.from('fb_outlets').select('id, name').eq('hotel_id', hotel.id);
  const { data: menuItems } = await supabase.from('fb_menu_items')
    .select('id, name, price, category_id, fb_menu_categories(name)')
    .in('outlet_id', outlets?.map(o => o.id) || [])
    .eq('available', true);

  const { data: activeRes } = await supabase
    .from('reservations').select('id, reservation_code, guests(first_name, last_name), rooms(room_number)')
    .eq('hotel_id', hotel.id).in('status', ['confirmed', 'checked_in']).order('check_in').limit(30);

  return <FBOrdersClient hotelId={hotel.id} orders={orders || []} outlets={outlets || []} menuItems={menuItems || []} activeReservations={activeRes || []} />;
}
