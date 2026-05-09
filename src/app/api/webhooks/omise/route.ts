import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const SUPPORTED_EVENTS = ['charge.complete', 'charge.expired', 'refund.create'];

function verifyOmiseWebhook(rawBody: string, signature: string | null) {
  const secret = process.env.OMISE_WEBHOOK_SECRET;
  if (!secret) return process.env.NODE_ENV !== 'production';
  if (!signature) return false;

  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = signature.replace(/^sha256=/, '');
  try {
    return crypto.timingSafeEqual(Buffer.from(normalized), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'webhooks.omise', 300, 60_000);
  if (limited) return limited;

  const rawBody = await request.text();
  const signature = request.headers.get('x-omise-signature') || request.headers.get('omise-signature');

  if (!verifyOmiseWebhook(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const supabase = createAdminClient();
  if (!SUPPORTED_EVENTS.includes(event.key)) return NextResponse.json({ ok: true });

  // Idempotency — prevent duplicate processing
  const eventId = event.id || `${event.key}_${event.data?.id}`;
  const { data: processed } = await supabase.from('audit_logs')
    .select('id').eq('action', 'webhook.omise').contains('changes', { omise_event_id: eventId }).maybeSingle();
  if (processed) return NextResponse.json({ received: true, duplicate: true });
  await supabase.from('audit_logs').insert({
    action: 'webhook.omise', entity_type: 'payment', entity_id: null,
    changes: { omise_event_id: eventId, event_type: event.key, processed_at: new Date().toISOString() },
  });

  const charge = event.data;
  const transactionId = charge.id;
  if (!transactionId) return NextResponse.json({ error: 'Missing transaction id' }, { status: 400 });

  if (event.key === 'charge.complete') {
    const { data: existing } = await supabase
      .from('payments')
      .select('id, status, reservation_id, amount')
      .eq('gateway_transaction_id', transactionId)
      .single();

    if (!existing) return NextResponse.json({ ok: true, ignored: 'payment_not_found' });

    const nextStatus = charge.status === 'successful' ? 'completed' : 'failed';
    const { data: payment } = await supabase
      .from('payments')
      .update({ status: nextStatus, paid_at: charge.paid_at || new Date().toISOString(), gateway_response: charge })
      .eq('id', existing.id)
      .select('reservation_id, amount, status')
      .single();

    if (payment?.reservation_id && charge.status === 'successful' && existing.status !== 'completed') {
      const { data: resv } = await supabase.from('reservations').select('paid_amount, hotel_id').eq('id', payment.reservation_id).single();
      if (resv) {
        await supabase
          .from('reservations')
          .update({ paid_amount: Number(resv.paid_amount || 0) + Number(payment.amount || 0) })
          .eq('id', payment.reservation_id);
        await supabase.from('audit_logs').insert({
          hotel_id: resv.hotel_id,
          action: 'payment.webhook.completed',
          entity_type: 'payment',
          entity_id: existing.id,
          changes: { gateway: 'omise', transactionId },
        });
      }
    }
  }

  if (event.key === 'refund.create') {
    await supabase
      .from('payments')
      .update({ status: 'refunded', refunded_at: new Date().toISOString(), refund_amount: Number(charge.amount || 0) / 100 })
      .eq('gateway_transaction_id', charge.charge);
  }

  return NextResponse.json({ ok: true });
}
