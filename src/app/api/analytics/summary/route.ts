import { NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ctx = await requireHotelAccess(searchParams.get('hotelId'));
  if (ctx.error) return ctx.error;

  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = `${now.toISOString().slice(0, 7)}-01T00:00:00.000Z`;

  const [roomsTotal, roomsOccupied, arrivalsToday, departuresToday, reservationsMonth, paymentRows, fbRows, spaRows] = await Promise.all([
    ctx.supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId),
    ctx.supabase.from('rooms').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId).eq('status', 'occupied'),
    ctx.supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId).eq('check_in', today).in('status', ['confirmed', 'pending']),
    ctx.supabase.from('reservations').select('id', { count: 'exact', head: true }).eq('hotel_id', ctx.hotelId).eq('check_out', today).eq('status', 'checked_in'),
    ctx.supabase.from('reservations').select('id,total_amount,created_at,status').eq('hotel_id', ctx.hotelId).gte('created_at', monthStart),
    ctx.supabase.from('payments').select('amount,status,created_at').eq('hotel_id', ctx.hotelId).gte('created_at', monthStart),
    ctx.supabase.from('fb_orders').select('total,status,created_at').eq('hotel_id', ctx.hotelId).gte('created_at', monthStart),
    ctx.supabase.from('spa_bookings').select('amount,status,created_at').eq('hotel_id', ctx.hotelId).gte('created_at', monthStart),
  ]);

  const payments = paymentRows.data || [];
  const fb = fbRows.data || [];
  const spa = spaRows.data || [];
  const reservations = reservationsMonth.data || [];

  const revenueMonth = payments.filter((p: any) => p.status === 'completed').reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const revenueToday = payments.filter((p: any) => p.status === 'completed' && String(p.created_at).slice(0, 10) === today).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
  const fbRevenue = fb.filter((o: any) => o.status === 'paid').reduce((s: number, o: any) => s + Number(o.total || 0), 0);
  const spaRevenue = spa.filter((b: any) => b.status !== 'cancelled').reduce((s: number, b: any) => s + Number(b.amount || 0), 0);
  const reservationValue = reservations.filter((r: any) => r.status !== 'cancelled').reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0);
  const totalRooms = roomsTotal.count || 0;
  const occupiedRooms = roomsOccupied.count || 0;

  return NextResponse.json({
    date: today,
    occupancyRate: totalRooms ? Math.round((occupiedRooms / totalRooms) * 100) : 0,
    rooms: { total: totalRooms, occupied: occupiedRooms },
    arrivalsToday: arrivalsToday.count || 0,
    departuresToday: departuresToday.count || 0,
    reservationsMonth: reservations.length,
    reservationValue,
    revenueToday,
    revenueMonth,
    fbRevenue,
    spaRevenue,
  });
}
