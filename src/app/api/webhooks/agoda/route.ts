import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { readWebhookToken, verifyBearerOrHeaderToken } from '@/lib/security/webhook';
import { rateLimit } from '@/lib/security/rate-limit';
import { getPayloadPropertyId, resolveOtaWebhookConnection } from '@/lib/ota/connections';

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'webhooks.agoda_webhook_token', 120, 60_000);
  if (limited) return limited;

  const rawBody = await request.text();
  const token = readWebhookToken(request);
  const expected = process.env.AGODA_WEBHOOK_TOKEN;

  if (process.env.NODE_ENV === 'production' && !verifyBearerOrHeaderToken(token, expected)) {
    return NextResponse.json({ error: 'Agoda webhook is not configured' }, { status: 501 });
  }

  let payload: any = null;
  try { payload = JSON.parse(rawBody); } catch {}

  const supabase = createAdminClient();
  const externalPropertyId = getPayloadPropertyId(payload);
  const connection = await resolveOtaWebhookConnection(supabase, 'agoda', externalPropertyId);

  await supabase.from('channel_sync_log').insert({
    sync_type: 'booking_pull',
    status: expected ? (connection ? 'queued' : 'unlinked_property') : 'staged_not_configured',
    records_processed: 0,
    errors: !expected
      ? { reason: 'AGODA_WEBHOOK_TOKEN missing or YCS parser not connected', payloadPreview: payload ? Object.keys(payload) : [] }
      : !connection
        ? { reason: 'No active OTA/channel connection matched property id', externalPropertyId }
        : null,
  });

  if (expected && connection) {
    await supabase.from('ota_sync_queue').insert({
      hotel_id: connection.hotelId,
      connection_id: connection.table === 'ota_connections' ? connection.id : null,
      provider: 'agoda',
      direction: 'pull',
      type: 'reservations',
      status: 'pending',
      payload: {
        ...(payload || {}),
        external_property_id: connection.externalPropertyId,
        received_via: 'agoda_webhook',
      },
      created_by: null,
    });
  }

  return NextResponse.json(
    { status: expected ? (connection ? 'queued' : 'unlinked_property') : 'not_configured', mode: 'staged' },
    { status: expected ? 202 : 501 },
  );
}
