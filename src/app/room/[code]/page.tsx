import { createAdminClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { InStayChatClient } from './in-stay-chat-client';
import type { Metadata } from 'next';


export const dynamic = 'force-dynamic';
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  return { title: 'In-room Service', description: 'สั่งบริการและ chat กับโรงแรม' };
}

export default async function InStayPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = createAdminClient();

  // code = hotel slug + room number, e.g. "my-hotel-101"
  const parts = code.split('-');
  const roomNumber = parts[parts.length - 1];
  const hotelSlug  = parts.slice(0, -1).join('-');

  const { data: hotel } = await supabase
    .from('hotels').select('id, name, logo_url, phone, check_in_time, check_out_time')
    .eq('slug', hotelSlug).single();
  if (!hotel) notFound();

  const { data: room } = await supabase
    .from('rooms').select('id, room_number, floor, room_type_id, room_types(name, amenities)')
    .eq('hotel_id', hotel.id).eq('room_number', roomNumber).single();

  // Find active reservation for this room
  const today = new Date().toISOString().slice(0, 10);
  const { data: reservation } = await supabase
    .from('reservations').select('id, reservation_code, check_out, guests(first_name, last_name)')
    .eq('hotel_id', hotel.id).eq('room_id', room?.id || '').lte('check_in', today).gte('check_out', today).in('status', ['confirmed', 'checked_in']).single();

  const { data: knowledge } = await supabase
    .from('knowledge_base').select('question, answer').eq('hotel_id', hotel.id).eq('active', true).limit(20);

  return <InStayChatClient hotel={hotel} room={room} reservation={reservation} knowledge={knowledge || []} />;
}
