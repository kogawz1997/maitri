/**
 * Post-Stay Journey
 * Runs daily at 10:00 ICT (03:00 UTC)
 *
 * Email timeline:
 *   1 day after checkout  → ขอบคุณ + ขอรีวิว (hot while fresh)
 *   7 days after checkout → "กลับมาเยี่ยมนะ" + loyalty points summary
 *   30 days after checkout → "เราคิดถึงคุณ" + special offer (ถ้า marketing consent)
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import sgMail from '@sendgrid/mail';
import { format, subDays } from 'date-fns';
import { th } from 'date-fns/locale';

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = { email: process.env.SENDGRID_FROM_EMAIL || 'noreply@maitri.co', name: process.env.SENDGRID_FROM_NAME || 'Maitri' };

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!process.env.SENDGRID_API_KEY)
    return NextResponse.json({ skipped: true, reason: 'SENDGRID_API_KEY not set' });

  const admin = createAdminClient();
  let sent = 0;

  for (const [daysAgo, trigger] of [[1,'review'], [7,'return'], [30,'winback']] as [number, string][]) {
    const targetDate = format(subDays(new Date(), daysAgo), 'yyyy-MM-dd');
    const { data: reservations } = await admin
      .from('reservations')
      .select('id, reservation_code, check_in, check_out, total_amount, guests(id, first_name, last_name, email, marketing_consent, loyalty_points), hotels(id, name, slug, phone, hero_image_url), room_types(name)')
      .eq('check_out', targetDate)
      .eq('status', 'checked_out')
      .not('guests.email', 'is', null);

    for (const r of reservations || []) {
      const guest = r.guests as any;
      const hotel = r.hotels as any;
      if (!guest?.email) continue;
      if (trigger === 'winback' && !guest.marketing_consent) continue;

      // Check not already sent this type
      const { data: existing } = await admin.from('email_logs')
        .select('id').eq('reservation_id', r.id).eq('type', trigger).single();
      if (existing) continue;

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
      let subject = '', html = '';

      if (trigger === 'review') {
        subject = `⭐ รบกวนขอรีวิวสักนิด — ${hotel.name}`;
        html = reviewEmail({ guest, hotel, reservation: r, appUrl });
      } else if (trigger === 'return') {
        subject = `💛 เราคิดถึงคุณ — ${hotel.name}`;
        html = returnEmail({ guest, hotel, reservation: r, appUrl });
      } else {
        subject = `🎁 ข้อเสนอพิเศษสำหรับคุณ — ${hotel.name}`;
        html = winbackEmail({ guest, hotel, reservation: r, appUrl });
      }

      try {
        await sgMail.send({ to: guest.email, from: FROM, subject, html });
        // Log sent email
        await admin.from('email_logs').insert({
          reservation_id: r.id,
          hotel_id: hotel.id,
          guest_id: guest.id,
          type: trigger,
          email: guest.email,
          sent_at: new Date().toISOString(),
        });
        sent++;
      } catch {}
    }
  }

  return NextResponse.json({ success: true, sent });
}

function base(body: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#FAF7F2;margin:0;padding:40px 0;">
<table width="600" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#2A2522;padding:20px 32px;"><span style="color:#fff;font-size:20px;font-weight:700;">🪷 Maitri</span></td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="background:#F5F2ED;padding:16px 32px;text-align:center;font-size:12px;color:#888;">Powered by Maitri PMS</td></tr>
</table></body></html>`;
}

function reviewEmail({ guest, hotel, reservation, appUrl }: any) {
  return base(`
    <h2 style="color:#2A2522;">ขอบคุณที่มาพักกับเรา ⭐</h2>
    <p style="color:#666;">สวัสดีคุณ ${guest.first_name} ขอบคุณที่เลือกพักที่ <strong>${hotel.name}</strong></p>
    <p style="color:#666;">รีวิวของคุณมีคุณค่ามากสำหรับเรา ใช้เวลาเพียง 2 นาที</p>
    <div style="text-align:center;margin:24px 0;">
      <p style="font-size:28px;margin:0;">⭐⭐⭐⭐⭐</p>
    </div>
    <a href="${appUrl}/portal/bookings" style="display:inline-block;background:#C66A30;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">เขียนรีวิว</a>
  `);
}

function returnEmail({ guest, hotel, reservation, appUrl }: any) {
  return base(`
    <h2 style="color:#2A2522;">เราคิดถึงคุณ 💛</h2>
    <p style="color:#666;">สวัสดีคุณ ${guest.first_name} ครบ 1 สัปดาห์แล้วตั้งแต่จากกัน</p>
    ${guest.loyalty_points ? `<div style="background:#FAF7F2;border-radius:12px;padding:16px;margin:16px 0;"><p style="margin:0;font-size:13px;color:#888;">แต้มสะสมของคุณ</p><p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#C66A30;">${Number(guest.loyalty_points).toLocaleString()} pts</p></div>` : ''}
    <p style="color:#666;font-size:14px;">ครั้งต่อไปเมื่อไหร่ก็ยินดีต้อนรับเสมอ</p>
    <a href="${appUrl}/booking/${hotel.slug || hotel.id}" style="display:inline-block;background:#2A2522;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">จองอีกครั้ง</a>
  `);
}

function winbackEmail({ guest, hotel, reservation, appUrl }: any) {
  return base(`
    <h2 style="color:#2A2522;">ข้อเสนอพิเศษสำหรับคุณ 🎁</h2>
    <p style="color:#666;">สวัสดีคุณ ${guest.first_name} เราขอมอบส่วนลดพิเศษ 10% สำหรับการกลับมาครั้งหน้า</p>
    <div style="background:#FFF8F5;border:2px dashed #C66A30;border-radius:12px;padding:16px;margin:16px 0;text-align:center;">
      <p style="margin:0;font-size:12px;color:#888;">โค้ดส่วนลด</p>
      <p style="margin:4px 0;font-family:monospace;font-size:24px;font-weight:700;color:#C66A30;letter-spacing:4px;">RETURN10</p>
      <p style="margin:0;font-size:12px;color:#888;">ส่วนลด 10% · ใช้ได้ถึงสิ้นเดือนหน้า</p>
    </div>
    <a href="${appUrl}/booking/${hotel.slug || hotel.id}" style="display:inline-block;background:#C66A30;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">จองเลย</a>
    <p style="color:#aaa;font-size:11px;margin-top:16px;">ไม่ต้องการรับโปรโมชั่น <a href="${appUrl}/portal/profile" style="color:#aaa;">คลิกที่นี่</a></p>
  `);
}
