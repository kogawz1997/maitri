import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import sgMail from '@sendgrid/mail';

if (process.env.SENDGRID_API_KEY) sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.SENDGRID_FROM_EMAIL || 'noreply@maitri.co',
  name: process.env.SENDGRID_FROM_NAME || 'Maitri',
};

export async function GET(request: NextRequest) {
  if (request.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!process.env.SENDGRID_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'SENDGRID_API_KEY not set' });
  }

  const admin = createAdminClient();
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

  const { data: rows } = await admin
    .from('reservations')
    .select('id, reservation_code, created_at, total_amount, guests(first_name, email), hotels(name, slug)')
    .eq('status', 'pending_payment')
    .lt('created_at', cutoff)
    .not('guests.email', 'is', null)
    .limit(300);

  let sent = 0;
  const errors: string[] = [];

  for (const r of rows || []) {
    const guest = r.guests as any;
    const hotel = r.hotels as any;
    if (!guest?.email) continue;

    const { data: existed } = await admin
      .from('email_logs')
      .select('id')
      .eq('reservation_id', r.id)
      .eq('type', 'abandoned_booking_recovery')
      .maybeSingle();
    if (existed) continue;

    try {
      await sgMail.send({
        to: guest.email,
        from: FROM,
        subject: `จองของคุณยังไม่เสร็จสิ้น — ${hotel?.name || 'Maitri'}`,
        html: abandonedTemplate({
          guestName: guest.first_name,
          reservationCode: r.reservation_code,
          totalAmount: Number(r.total_amount || 0),
          continueUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/portal/bookings`,
        }),
      });

      await admin.from('email_logs').insert({
        reservation_id: r.id,
        hotel_id: hotel?.id || null,
        guest_id: guest?.id || null,
        type: 'abandoned_booking_recovery',
        email: guest.email,
        sent_at: new Date().toISOString(),
      });
      sent++;
    } catch (e: any) {
      errors.push(`${guest.email}: ${e?.message || 'send_failed'}`);
    }
  }

  return NextResponse.json({ success: true, sent, errors: errors.length, details: errors.slice(0, 20) });
}

function abandonedTemplate({ guestName, reservationCode, totalAmount, continueUrl }: { guestName?: string; reservationCode?: string; totalAmount: number; continueUrl: string }) {
  return `<!doctype html><html><body style="font-family:sans-serif;background:#FAF7F2;padding:24px;">
  <table width="100%" style="max-width:560px;margin:auto;background:#fff;border-radius:14px;padding:24px;">
    <tr><td>
      <h2 style="margin:0 0 8px;color:#2A2522;">จองยังไม่เสร็จนะ${guestName ? ` คุณ${guestName}` : ''} 👀</h2>
      <p style="color:#666;font-size:14px;">เราบันทึกการจองของคุณไว้แล้ว แต่ยังรอชำระเงินเพื่อยืนยันการจอง</p>
      <div style="background:#FAF7F2;border-radius:10px;padding:12px;margin:12px 0;">
        <p style="margin:0;color:#555;font-size:13px;">รหัสจอง: <b>${reservationCode || '-'}</b></p>
        <p style="margin:6px 0 0;color:#555;font-size:13px;">ยอดประมาณการ: <b>${totalAmount.toLocaleString()} บาท</b></p>
      </div>
      <a href="${continueUrl}" style="display:inline-block;background:#C66A30;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600;">กลับไปทำรายการต่อ</a>
    </td></tr>
  </table>
  </body></html>`;
}
