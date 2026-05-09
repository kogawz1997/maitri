import { requireHotelAccess } from '@/lib/auth/guards';
import { tm30Service } from '@/lib/compliance';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get('hotelId');
  const from = searchParams.get('from') || new Date().toISOString().slice(0, 10);
  const to = searchParams.get('to') || from;
  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager', 'front_desk', 'receptionist']);
  if (ctx.error) return ctx.error;

  const { data: reservations, error } = await ctx.supabase
    .from('reservations')
    .select('id, check_in, room_id, guests(full_name, passport_number, nationality), hotels(name, address), rooms(number)')
    .eq('hotel_id', ctx.hotelId)
    .gte('check_in', from)
    .lte('check_in', to)
    .order('check_in');

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const reports = (reservations || []).map((r: any) => ({
    passportNumber: r.guests?.passport_number || '',
    nationality: r.guests?.nationality || '',
    fullName: r.guests?.full_name || '',
    arrivalDate: r.check_in,
    hotelName: r.hotels?.name || ctx.hotel?.name || '',
    hotelAddress: r.hotels?.address || ctx.hotel?.address || '',
    roomNumber: r.rooms?.number || '',
  })).filter((r: any) => r.passportNumber && r.fullName);

  const csv = tm30Service.generateBatchFile(reports);
  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tm30-${from}-to-${to}.csv"`,
    },
  });
}
