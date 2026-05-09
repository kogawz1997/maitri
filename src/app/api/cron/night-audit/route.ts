/**
 * Night Audit — runs daily at 01:00 ICT (18:00 UTC prev day)
 *
 * Tasks:
 * 1. ปิด folio ของวันที่ผ่านมา
 * 2. Auto checkout สำหรับ reservation ที่เลย check_out แล้ว
 * 3. Mark no-shows
 * 4. คำนวณ revenue summary ของวัน
 * 5. Post audit log
 * 6. ส่ง daily summary email ให้ hotel owner
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { createCheckoutTasks } from '@/lib/housekeeping/auto-tasks';
import sgMail from '@sendgrid/mail';
import { format, subDays } from 'date-fns';
import { generateTodayTasks, autoAssignTasks } from '@/lib/housekeeping/auto-tasks';
import { th } from 'date-fns/locale';

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const FROM = { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@maitri.co', name: process.env.SENDGRID_FROM_NAME || 'Maitri' };

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const today     = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const results: Record<string, any> = {};

  // --- 1. Get all hotels ---
  const { data: hotels } = await admin.from('hotels').select('id, name, email, organization_id');

  for (const hotel of hotels || []) {
    const hotelResult: any = { hotelId: hotel.id, name: hotel.name };

    // --- 2. Auto checkout: status=checked_in, check_out <= yesterday ---
    const { data: autoCheckouts, error: coErr } = await admin
      .from('reservations')
      .update({ status: 'checked_out' })
      .eq('hotel_id', hotel.id)
      .eq('status', 'checked_in')
      .lte('check_out', yesterday)
      .select('id, reservation_code');
    hotelResult.autoCheckouts = autoCheckouts?.length || 0;

    // Auto-create housekeeping tasks for checked-out rooms
    for (const co of autoCheckouts || []) {
      createCheckoutTasks(hotel.id, co.id).catch(() => {});
    }

    // --- 3. Mark no-shows: status=confirmed, check_in <= yesterday ---
    const { data: noShows } = await admin
      .from('reservations')
      .update({ status: 'no_show' })
      .eq('hotel_id', hotel.id)
      .eq('status', 'confirmed')
      .lte('check_in', yesterday)
      .select('id, reservation_code');
    hotelResult.noShows = noShows?.length || 0;

    // --- 4. Revenue summary for yesterday ---
    const { data: revenue } = await admin
      .from('reservations')
      .select('total_amount, source')
      .eq('hotel_id', hotel.id)
      .eq('check_in', yesterday)
      .neq('status', 'cancelled')
      .neq('status', 'no_show');

    const totalRevenue = revenue?.reduce((s, r) => s + Number(r.total_amount || 0), 0) || 0;
    const bookingCount = revenue?.length || 0;
    const bySource: Record<string, number> = {};
    revenue?.forEach(r => { bySource[r.source || 'direct'] = (bySource[r.source || 'direct'] || 0) + 1; });
    hotelResult.revenue = totalRevenue;
    hotelResult.bookings = bookingCount;
    hotelResult.bySource = bySource;

    // --- 5. Occupancy: checked_in today ---
    const { count: occupiedCount } = await admin
      .from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .in('status', ['checked_in', 'confirmed'])
      .lte('check_in', today)
      .gte('check_out', today);

    const { count: totalRooms } = await admin
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('hotel_id', hotel.id)
      .eq('status', 'available');

    const occupancy = totalRooms ? Math.round(((occupiedCount || 0) / totalRooms) * 100) : 0;
    hotelResult.occupancy = occupancy;
    hotelResult.occupiedRooms = occupiedCount || 0;
    hotelResult.totalRooms = totalRooms || 0;

    // --- Auto housekeeping tasks ---
    const hkResult = await generateTodayTasks(hotel.id);
    await autoAssignTasks(hotel.id);
    hotelResult.hkTasksCreated = hkResult.created;

    // --- 6. Write audit log ---
    await admin.from('audit_logs').insert({
      hotel_id: hotel.id,
      action: 'night_audit.completed',
      entity_type: 'hotel',
      entity_id: hotel.id,
      changes: {
        date: yesterday,
        revenue: totalRevenue,
        bookings: bookingCount,
        occupancy,
        auto_checkouts: autoCheckouts?.length || 0,
        no_shows: noShows?.length || 0,
      },
    });

    // --- 7. Send summary email to hotel (if email set and SendGrid ready) ---
    if (hotel.email && process.env.SENDGRID_API_KEY) {
      try {
        await sgMail.send({
          to: hotel.email,
          from: FROM,
          subject: `📊 Night Audit ${format(new Date(yesterday), 'd MMM yyyy', { locale: th })} — ${hotel.name}`,
          html: nightAuditEmail({ hotel, yesterday, totalRevenue, bookingCount, occupancy, occupiedCount: occupiedCount || 0, totalRooms: totalRooms || 0, noShows: noShows?.length || 0, autoCheckouts: autoCheckouts?.length || 0, bySource }),
        });
        hotelResult.emailSent = true;
      } catch { hotelResult.emailSent = false; }
    }

    results[hotel.id] = hotelResult;
  }

  return NextResponse.json({ success: true, date: yesterday, hotels: Object.values(results) });
}

function nightAuditEmail({ hotel, yesterday, totalRevenue, bookingCount, occupancy, occupiedCount, totalRooms, noShows, autoCheckouts, bySource }: any) {
  const fmt = (n: number) => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB', maximumFractionDigits: 0 }).format(n);
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#FAF7F2;margin:0;padding:40px 0;">
<table width="600" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#2A2522;padding:20px 32px;"><span style="color:#fff;font-size:20px;font-weight:700;">🪷 Night Audit</span></td></tr>
<tr><td style="padding:32px;">
  <h2 style="color:#2A2522;margin:0 0 4px;">${hotel.name}</h2>
  <p style="color:#888;margin:0 0 24px;font-size:14px;">รายงาน ${yesterday}</p>

  <table width="100%" style="border-collapse:collapse;margin-bottom:24px;">
    <tr style="background:#FAF7F2;">
      <td style="padding:12px;text-align:center;border-radius:8px 0 0 8px;">
        <div style="font-size:28px;font-weight:700;color:#C66A30;">${fmt(totalRevenue)}</div>
        <div style="font-size:12px;color:#888;">รายได้วานนี้</div>
      </td>
      <td style="padding:12px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2A2522;">${bookingCount}</div>
        <div style="font-size:12px;color:#888;">การจอง</div>
      </td>
      <td style="padding:12px;text-align:center;border-radius:0 8px 8px 0;">
        <div style="font-size:28px;font-weight:700;color:#${occupancy >= 70 ? '16A34A' : occupancy >= 40 ? 'D97706' : 'DC2626'};">${occupancy}%</div>
        <div style="font-size:12px;color:#888;">Occupancy (${occupiedCount}/${totalRooms})</div>
      </td>
    </tr>
  </table>

  ${noShows > 0 ? `<div style="background:#FEF2F2;border-left:3px solid #EF4444;padding:10px 14px;border-radius:4px;margin-bottom:12px;font-size:13px;color:#B91C1C;">⚠️ No-show ${noShows} ห้อง</div>` : ''}
  ${autoCheckouts > 0 ? `<div style="background:#F0FDF4;border-left:3px solid #22C55E;padding:10px 14px;border-radius:4px;margin-bottom:12px;font-size:13px;color:#15803D;">✅ Auto checkout ${autoCheckouts} ห้อง</div>` : ''}

  ${Object.keys(bySource).length > 0 ? `
  <p style="font-weight:600;font-size:13px;margin-bottom:8px;">แหล่งการจอง</p>
  <table width="100%" style="font-size:12px;color:#666;">
    ${Object.entries(bySource).map(([src, cnt]: any) => `<tr><td style="padding:3px 0;">${src}</td><td style="text-align:right;">${cnt} ห้อง</td></tr>`).join('')}
  </table>` : ''}
</td></tr>
<tr><td style="background:#F5F2ED;padding:14px 32px;text-align:center;font-size:12px;color:#888;">Maitri PMS Night Audit · Generated automatically</td></tr>
</table></body></html>`;
}
