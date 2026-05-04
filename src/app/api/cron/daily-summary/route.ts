import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// Vercel Cron — runs every day at 08:00 ICT (01:00 UTC)
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: hotels } = await admin
    .from('hotels')
    .select('id, name, organization_id');

  const summaries = await Promise.all((hotels || []).map(async (hotel) => {
    const [{ count: arrivals }, { count: departures }, { data: revenue }] = await Promise.all([
      admin.from('reservations').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('check_in', today),
      admin.from('reservations').select('*', { count: 'exact', head: true }).eq('hotel_id', hotel.id).eq('check_out', today),
      admin.from('payments').select('amount').eq('hotel_id', hotel.id).eq('payment_date', today).eq('status', 'completed'),
    ]);
    const totalRevenue = revenue?.reduce((s, p) => s + Number(p.amount), 0) || 0;
    return { hotelId: hotel.id, hotelName: hotel.name, arrivals, departures, revenue: totalRevenue };
  }));

  console.log(`[Cron Daily] Generated ${summaries.length} hotel summaries for ${today}`);

  return NextResponse.json({ date: today, summaries });
}
