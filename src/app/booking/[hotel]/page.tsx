import { createAdminClient } from '@/lib/supabase/server';
import { BookingEngine } from '@/components/booking/booking-engine';
import { notFound } from 'next/navigation';

export default async function BookingPage({ params }: { params: Promise<{ hotel: string }> }) {
  const { hotel: slug } = await params;
  const supabase = createAdminClient();
  const { data: hotel } = await supabase
    .from('hotels').select('*').eq('slug', slug).single();
  if (!hotel) notFound();

  const { data: roomTypes } = await supabase
    .from('room_types').select('*').eq('hotel_id', hotel.id);

  return <BookingEngine hotel={hotel} roomTypes={roomTypes || []} />;
}
