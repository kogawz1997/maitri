import { NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { createAdminClient } from '@/lib/supabase/server';
import { requireCronSecret } from '@/lib/auth/guards';

export async function GET(request: Request) {
  const unauthorized = requireCronSecret(request);
  if (unauthorized) return unauthorized;

  const admin = createAdminClient();
  const cutoff = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const { data, error } = await admin
    .from('reservations')
    .update({ status: 'no_show', no_show_marked_at: new Date().toISOString() })
    .in('status', ['pending', 'confirmed'])
    .lte('check_in', cutoff)
    .select('id, hotel_id, reservation_code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (data?.length) {
    await admin.from('audit_logs').insert(data.map((reservation: any) => ({
      hotel_id: reservation.hotel_id,
      action: 'reservation.no_show.auto_marked',
      entity_type: 'reservation',
      entity_id: reservation.id,
      changes: { cutoff, reservation_code: reservation.reservation_code },
    })));
  }

  return NextResponse.json({ success: true, cutoff, marked: data?.length || 0, reservations: data || [] });
}
