import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  numAdults: z.coerce.number().int().min(1).max(20).optional(),
  numChildren: z.coerce.number().int().min(0).max(20).optional(),
  specialRequests: z.string().max(2000).optional().nullable(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const json = await request.json().catch(() => null);
  const parsed = schema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id,hotel_id,status,check_in,check_out,guest_account_id')
    .eq('id', id)
    .single();
  if (!reservation || reservation.guest_account_id !== user.id) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  if (!['confirmed', 'pending'].includes(reservation.status)) return NextResponse.json({ error: 'สถานะการจองนี้แก้ไขไม่ได้' }, { status: 400 });

  const hoursUntilCheckIn = (new Date(reservation.check_in).getTime() - Date.now()) / 3_600_000;
  if (hoursUntilCheckIn < 24) return NextResponse.json({ error: 'ไม่สามารถแก้ไขได้ภายใน 24 ชั่วโมงก่อน check-in' }, { status: 400 });

  const updatePayload: Record<string, any> = {};
  const d = parsed.data;
  if (d.checkIn) updatePayload.check_in = d.checkIn;
  if (d.checkOut) updatePayload.check_out = d.checkOut;
  if (typeof d.numAdults === 'number') updatePayload.num_adults = d.numAdults;
  if (typeof d.numChildren === 'number') updatePayload.num_children = d.numChildren;
  if (typeof d.specialRequests !== 'undefined') updatePayload.special_requests = d.specialRequests;
  if (Object.keys(updatePayload).length === 0) return NextResponse.json({ error: 'ไม่มีข้อมูลที่ต้องการแก้ไข' }, { status: 400 });

  const { error } = await supabase.from('reservations').update(updatePayload).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    hotel_id: reservation.hotel_id,
    user_id: user.id,
    action: 'guest.booking.modified',
    entity_type: 'reservation',
    entity_id: id,
    changes: updatePayload,
  });
  return NextResponse.json({ success: true, updates: updatePayload });
}
