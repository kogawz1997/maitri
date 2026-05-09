import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const checkInSchema = z.object({
  estimatedArrival: z.string().datetime().optional().nullable(),
  specialRequests: z.string().max(2000).optional().nullable(),
  idDocumentType: z.enum(['passport', 'id_card', 'driver_license']).optional().nullable(),
  idDocumentLast4: z.string().max(16).optional().nullable(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id,reservation_code,guest_account_id,status,check_in')
    .eq('id', id)
    .single();
  if (!reservation || reservation.guest_account_id !== user.id) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });

  const checkInUrl = `${new URL(request.url).origin}/portal/bookings/qr?reservationId=${reservation.id}`;
  return NextResponse.json({
    reservationId: reservation.id,
    reservationCode: reservation.reservation_code,
    status: reservation.status,
    checkInDate: reservation.check_in,
    qrPayload: checkInUrl,
  });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = checkInSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: reservation } = await supabase
    .from('reservations')
    .select('id,hotel_id,guest_account_id,status,check_in')
    .eq('id', id)
    .single();
  if (!reservation || reservation.guest_account_id !== user.id) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  if (!['confirmed', 'pending'].includes(reservation.status)) return NextResponse.json({ error: 'สถานะการจองไม่รองรับ digital check-in' }, { status: 400 });

  const d = parsed.data;
  const { error } = await supabase.from('reservations').update({
    estimated_arrival: d.estimatedArrival || null,
    special_requests: d.specialRequests || null,
    notes: d.idDocumentType ? `Digital check-in: ${d.idDocumentType}${d.idDocumentLast4 ? ` ****${d.idDocumentLast4}` : ''}` : null,
  }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    hotel_id: reservation.hotel_id,
    user_id: user.id,
    action: 'guest.checkin.submitted',
    entity_type: 'reservation',
    entity_id: reservation.id,
    changes: { estimated_arrival: d.estimatedArrival || null, id_document_type: d.idDocumentType || null },
  });
  return NextResponse.json({ success: true, message: 'ส่งข้อมูล check-in ล่วงหน้าแล้ว' });
}
