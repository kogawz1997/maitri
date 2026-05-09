/**
 * Pre-arrival Email Series
 * Runs daily at 09:00 ICT (02:00 UTC)
 *
 * Email timeline:
 *   7 days before check-in → "เราตื่นเต้นที่จะต้อนรับคุณ" + upsell
 *   3 days before check-in → ข้อมูลเดินทาง + local tips
 *   1 day before check-in  → reminder + estimated arrival request
 */
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import sgMail from '@sendgrid/mail';
import { format, addDays } from 'date-fns';
import { th } from 'date-fns/locale';

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@maitri.co',
  name:  process.env.SENDGRID_FROM_NAME  || 'Maitri',
};

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'SENDGRID_API_KEY not set' });
  }

  const admin = createAdminClient();
  const today = format(new Date(), 'yyyy-MM-dd');
  const day1  = format(addDays(new Date(), 1), 'yyyy-MM-dd');
  const day3  = format(addDays(new Date(), 3), 'yyyy-MM-dd');
  const day7  = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  let sent = 0;
  const errors: string[] = [];

  // Fetch reservations for each trigger date
  for (const [daysOut, checkInDate, emailType] of [
    [7, day7, '7day'],
    [3, day3, '3day'],
    [1, day1, '1day'],
  ] as [number, string, string][]) {
    const { data: reservations } = await admin
      .from('reservations')
      .select('id, reservation_code, check_in, check_out, nights, num_adults, special_requests, guests(first_name, last_name, email), hotels(name, city, phone, email, address, check_in_time, check_out_time, hero_image_url, slug), room_types(name)')
      .eq('check_in', checkInDate)
      .in('status', ['confirmed'])
      .not('guests.email', 'is', null);

    for (const r of reservations || []) {
      const guest = r.guests as any;
      const hotel = r.hotels as any;
      const rt    = r.room_types as any;
      if (!guest?.email) continue;

      try {
        if (emailType === '7day') {
          await sgMail.send({
            to: guest.email, from: FROM,
            subject: `🌟 เราตื่นเต้นที่จะต้อนรับคุณ — ${hotel.name}`,
            html: preArrival7Day({ guest, hotel, rt, reservation: r }),
          });
        } else if (emailType === '3day') {
          await sgMail.send({
            to: guest.email, from: FROM,
            subject: `🗺️ เตรียมตัวก่อนเดินทาง — ${hotel.name}`,
            html: preArrival3Day({ guest, hotel, rt, reservation: r }),
          });
        } else {
          await sgMail.send({
            to: guest.email, from: FROM,
            subject: `🌅 พรุ่งนี้เจอกัน! เตือนเช็คอิน — ${hotel.name}`,
            html: preArrival1Day({ guest, hotel, rt, reservation: r }),
          });
        }
        sent++;
      } catch (err: any) {
        errors.push(`${guest.email}: ${err.message}`);
      }
    }
  }

  return NextResponse.json({ success: true, sent, errors: errors.length, details: errors });
}

function base(title: string, body: string) {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#FAF7F2;margin:0;padding:40px 0;">
<table width="600" style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;">
<tr><td style="background:#2A2522;padding:20px 32px;">
  <span style="color:#fff;font-size:20px;font-weight:700;">🪷 Maitri</span>
</td></tr>
<tr><td style="padding:32px;">${body}</td></tr>
<tr><td style="background:#F5F2ED;padding:16px 32px;text-align:center;font-size:12px;color:#888;">
  Powered by Maitri PMS · Thailand 🇹🇭
</td></tr>
</table></body></html>`;
}

function preArrival7Day({ guest, hotel, rt, reservation }: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return base('ตื่นเต้นต้อนรับ', `
    <h2 style="color:#2A2522;font-size:24px;">สวัสดีคุณ ${guest.first_name}! 🌟</h2>
    <p style="color:#666;">อีก <strong>7 วัน</strong> เราจะได้ต้อนรับคุณที่ <strong>${hotel.name}</strong></p>
    ${hotel.hero_image_url ? `<img src="${hotel.hero_image_url}" style="width:100%;border-radius:12px;margin:16px 0;" />` : ''}
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px 0;color:#888;font-size:13px;">ห้องพัก</td><td style="font-weight:600;font-size:13px;">${rt?.name || '-'}</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:13px;">เช็คอิน</td><td style="font-weight:600;font-size:13px;">${format(new Date(reservation.check_in + 'T00:00:00'), 'd MMMM yyyy', { locale: th })} · หลัง ${hotel.check_in_time || '14:00'} น.</td></tr>
      <tr><td style="padding:8px 0;color:#888;font-size:13px;">เช็คเอาท์</td><td style="font-weight:600;font-size:13px;">${format(new Date(reservation.check_out + 'T00:00:00'), 'd MMMM yyyy', { locale: th })}</td></tr>
    </table>
    <p style="color:#666;font-size:14px;">หากต้องการอัพเกรดห้องหรือเพิ่ม Spa package ติดต่อเราได้เลย ${hotel.phone ? `📞 ${hotel.phone}` : ''}</p>
    <a href="${appUrl}/portal/bookings" style="display:inline-block;background:#C66A30;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">ดูรายละเอียดการจอง</a>
  `);
}

function preArrival3Day({ guest, hotel, rt, reservation }: any) {
  return base('ข้อมูลเดินทาง', `
    <h2 style="color:#2A2522;font-size:24px;">อีก 3 วัน เจอกันแล้ว! 🗺️</h2>
    <p style="color:#666;">สวัสดีคุณ ${guest.first_name} ต่อไปนี้คือข้อมูลที่ควรรู้ก่อนเดินทาง</p>
    <div style="background:#FAF7F2;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#2A2522;">📍 ${hotel.name}</p>
      ${hotel.address ? `<p style="margin:4px 0 0;color:#666;font-size:13px;">${hotel.address}</p>` : ''}
      ${hotel.phone ? `<p style="margin:4px 0 0;color:#666;font-size:13px;">📞 ${hotel.phone}</p>` : ''}
    </div>
    <div style="background:#FAF7F2;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0;font-weight:600;color:#2A2522;">⏰ เวลาสำคัญ</p>
      <p style="margin:4px 0 0;color:#666;font-size:13px;">Check-in: หลัง ${hotel.check_in_time || '14:00'} น.</p>
      <p style="margin:4px 0 0;color:#666;font-size:13px;">Check-out: ก่อน ${hotel.check_out_time || '12:00'} น.</p>
    </div>
    <p style="color:#666;font-size:13px;">มีคำถามอะไรก็ทักมาหาเราได้เลยครับ/ค่ะ</p>
  `);
}

function preArrival1Day({ guest, hotel, rt, reservation }: any) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  return base('เตือนเช็คอินพรุ่งนี้', `
    <h2 style="color:#2A2522;font-size:24px;">พรุ่งนี้เจอกันแล้ว! 🌅</h2>
    <p style="color:#666;">สวัสดีคุณ ${guest.first_name} พรุ่งนี้วันเช็คอินแล้ว เราพร้อมต้อนรับคุณ</p>
    <div style="background:#F0FDF4;border:1px solid #86EFAC;border-radius:12px;padding:16px;margin:16px 0;">
      <p style="margin:0;color:#16A34A;font-weight:600;">✅ เช็คอินได้ตั้งแต่ ${hotel.check_in_time || '14:00'} น.</p>
      <p style="margin:4px 0 0;color:#555;font-size:13px;">รหัสจอง: <strong style="font-family:monospace;">${reservation.reservation_code}</strong></p>
    </div>
    <p style="color:#666;font-size:14px;">กรุณาแสดง <strong>รหัสการจอง</strong> หรือ <strong>อีเมลยืนยัน</strong> เมื่อถึง reception</p>
    <a href="${appUrl}/portal/bookings/qr?code=${reservation.reservation_code}" style="display:inline-block;background:#2A2522;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:8px;">แสดง QR Check-in</a>
  `);
}
