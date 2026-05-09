import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getHotelCopy } from '@/lib/i18n/hotel-copy';
import { readWebhookToken, verifyBearerOrHeaderToken } from '@/lib/security/webhook';
function mapTemplate(trigger: string) {
  if (trigger === 'checkin_minus_1_day') return 'checkInReminder';
  if (trigger === 'checkout_day') return 'checkoutReminder';
  if (trigger === 'payment_overdue') return 'paymentReminder';
  if (trigger === 'post_checkout_review') return 'reviewRequest';
  return 'checkInReminder';
}
async function runAutomation(request: Request) {
  const token = readWebhookToken(request);
  if (!verifyBearerOrHeaderToken(token, process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const admin = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const { data: rules, error: ruleError } = await admin.from('automation_rules').select('*, hotels(id, name)').eq('enabled', true).in('trigger', ['checkin_minus_1_day', 'checkout_day', 'payment_overdue', 'post_checkout_review']);
  if (ruleError) return NextResponse.json({ error: ruleError.message }, { status: 500 });
  let queued = 0; let skipped = 0;
  for (const rule of rules || []) {
    let q = admin.from('reservations').select('id, hotel_id, guest_name, guest_email, guest_phone, check_in, check_out, status, balance_due, preferred_language').eq('hotel_id', rule.hotel_id).neq('status', 'cancelled');
    if (rule.trigger === 'checkin_minus_1_day') q = q.eq('check_in', tomorrow);
    if (rule.trigger === 'checkout_day') q = q.eq('check_out', today);
    if (rule.trigger === 'payment_overdue') q = q.gt('balance_due', 0).lte('check_in', tomorrow);
    if (rule.trigger === 'post_checkout_review') q = q.eq('check_out', today).eq('status', 'checked_out');
    const { data: reservations } = await q.limit(100);
    for (const reservation of reservations || []) {
      const templateKey = (rule.template_key || mapTemplate(rule.trigger)) as any;
      const message = getHotelCopy(reservation.preferred_language || 'en', templateKey);
      const dedupeKey = `${rule.id}:${reservation.id}:${rule.trigger}:${today}`;
      const { data: existing } = await admin.from('automation_runs').select('id').eq('dedupe_key', dedupeKey).maybeSingle();
      if (existing) { skipped += 1; continue; }
      const { error } = await admin.from('automation_runs').insert({ hotel_id: rule.hotel_id, rule_id: rule.id, reservation_id: reservation.id, channel: rule.channel, status: 'queued', dedupe_key: dedupeKey, payload: { message, trigger: rule.trigger, guest_name: reservation.guest_name, to: reservation.guest_email || reservation.guest_phone } });
      if (!error) queued += 1; else if (String(error.message || '').includes('duplicate')) skipped += 1;
    }
  }
  return NextResponse.json({ ok: true, queued, skipped, ranAt: now.toISOString() });
}
export async function POST(request: Request) { return runAutomation(request); }
export async function GET(request: Request) { return runAutomation(request); }
