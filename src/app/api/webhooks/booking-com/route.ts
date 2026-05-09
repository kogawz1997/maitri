import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { readWebhookToken, verifyBearerOrHeaderToken } from '@/lib/security/webhook';
import { rateLimit } from '@/lib/security/rate-limit';
import { getPayloadPropertyId, resolveOtaWebhookConnection } from '@/lib/ota/connections';

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'webhooks.booking_com_webhook_token', 120, 60_000);
  if (limited) return limited;

  const body = await request.text();
  let payload: any = null;
  try { payload = body ? JSON.parse(body) : null; } catch {}

  const token = readWebhookToken(request);
  const expected = process.env.BOOKING_COM_WEBHOOK_TOKEN;

  if (process.env.NODE_ENV === 'production' && !verifyBearerOrHeaderToken(token, expected)) {
    return NextResponse.json({ error: 'Booking.com webhook is not configured' }, { status: 501 });
  }

  const supabase = createAdminClient();
  const externalPropertyId = getPayloadPropertyId(payload);
  const connection = await resolveOtaWebhookConnection(supabase, 'booking_com', externalPropertyId);

  await supabase.from('channel_sync_log').insert({
    sync_type: 'booking_pull',
    status: expected ? (connection ? 'queued' : 'unlinked_property') : 'staged_not_configured',
    records_processed: 0,
    errors: !expected
      ? { reason: 'BOOKING_COM_WEBHOOK_TOKEN missing or partner parser not connected', sampleBytes: body.length }
      : !connection
        ? { reason: 'No active OTA/channel connection matched property id', externalPropertyId }
        : null,
  });

  if (expected && connection) {
    await supabase.from('ota_sync_queue').insert({
      hotel_id: connection.hotelId,
      connection_id: connection.table === 'ota_connections' ? connection.id : null,
      provider: 'booking_com',
      direction: 'pull',
      type: 'reservations',
      status: 'pending',
      payload: {
        ...(payload || { rawSize: body.length }),
        external_property_id: connection.externalPropertyId,
        received_via: 'booking_com_webhook',
      },
      created_by: null,
    });
  }

  const status = expected ? (connection ? 'queued' : 'unlinked_property') : 'not_configured';
  return new Response(`<?xml version="1.0"?><response status="${status}" mode="staged"/>`, {
    headers: { 'Content-Type': 'application/xml' },
    status: expected ? 202 : 501,
  });
}
