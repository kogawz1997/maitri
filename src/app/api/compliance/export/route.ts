/**
 * Compliance Data Export
 * Exports guest data in CSV format for TM30/eTax/PDPA compliance
 * Fallback when vendor API is unavailable
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hotelId   = searchParams.get('hotelId') || '';
  const type      = searchParams.get('type') || 'tm30'; // tm30 | etax | guests | reservations
  const dateFrom  = searchParams.get('from') || format(new Date(), 'yyyy-MM-01');
  const dateTo    = searchParams.get('to')   || format(new Date(), 'yyyy-MM-dd');

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  let csv = '';
  let filename = '';

  if (type === 'tm30') {
    // TM30 foreign guest report
    const { data } = await admin
      .from('reservations')
      .select('check_in, check_out, guests(first_name, last_name, nationality, passport_no, date_of_birth), rooms(room_number)')
      .eq('hotel_id', hotelId)
      .gte('check_in', dateFrom)
      .lte('check_in', dateTo)
      .neq('guests.nationality', 'TH')
      .neq('status', 'cancelled');

    csv = 'ชื่อ,นามสกุล,สัญชาติ,เลขพาสปอร์ต,วันเกิด,วันเช็คอิน,วันเช็คเอาท์,เลขห้อง\n';
    for (const r of data || []) {
      const g = r.guests as any;
      const rm = r.rooms as any;
      if (g?.nationality !== 'TH') {
        csv += `"${g?.first_name}","${g?.last_name || ''}","${g?.nationality || ''}","${g?.passport_no || ''}","${g?.date_of_birth || ''}","${r.check_in}","${r.check_out}","${rm?.room_number || ''}"\n`;
      }
    }
    filename = `TM30_${dateFrom}_${dateTo}.csv`;

  } else if (type === 'etax') {
    // Thai e-Tax invoice data
    const { data } = await admin
      .from('reservations')
      .select('reservation_code, check_in, check_out, total_amount, paid_amount, payment_status, guests(first_name, last_name, email)')
      .eq('hotel_id', hotelId)
      .gte('check_in', dateFrom)
      .lte('check_in', dateTo)
      .eq('payment_status', 'paid');

    csv = 'เลขการจอง,ชื่อลูกค้า,อีเมล,วันเช็คอิน,วันเช็คเอาท์,ยอดรวม,VAT,ยอดก่อน VAT\n';
    for (const r of data || []) {
      const g = r.guests as any;
      const total   = Number(r.total_amount);
      const vat     = Math.round(total * 7 / 107 * 100) / 100;
      const beforeVat = total - vat;
      csv += `"${r.reservation_code}","${g?.first_name} ${g?.last_name || ''}","${g?.email || ''}","${r.check_in}","${r.check_out}","${total}","${vat}","${beforeVat}"\n`;
    }
    filename = `eTax_${dateFrom}_${dateTo}.csv`;

  } else if (type === 'guests') {
    const { data } = await admin
      .from('reservations')
      .select('check_in, check_out, guests(first_name, last_name, email, phone, nationality)')
      .eq('hotel_id', hotelId)
      .gte('check_in', dateFrom)
      .lte('check_in', dateTo)
      .neq('status', 'cancelled');

    csv = 'ชื่อ,นามสกุล,อีเมล,โทรศัพท์,สัญชาติ,วันเช็คอิน,วันเช็คเอาท์\n';
    for (const r of data || []) {
      const g = r.guests as any;
      csv += `"${g?.first_name}","${g?.last_name || ''}","${g?.email || ''}","${g?.phone || ''}","${g?.nationality || ''}","${r.check_in}","${r.check_out}"\n`;
    }
    filename = `Guests_${dateFrom}_${dateTo}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
