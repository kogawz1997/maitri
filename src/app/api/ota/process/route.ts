import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { readWebhookToken, verifyBearerOrHeaderToken } from '@/lib/security/webhook';
import { rateLimit } from '@/lib/security/rate-limit';

async function processQueue(request: Request) {
  const limited = await rateLimit(request, 'ota.sync.process', 30, 60_000);
  if (limited) return limited;
  const token = readWebhookToken(request);
  if (!verifyBearerOrHeaderToken(token, process.env.CRON_SECRET)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: jobs, error } = await admin
    .from('ota_sync_queue')
    .select('*')
    .in('status', ['pending', 'retry'])
    .order('created_at', { ascending: true })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  let failed = 0;
  let duplicates = 0;

  for (const job of jobs || []) {
    const started = Date.now();
    await admin.from('ota_sync_queue').update({ status: 'processing', attempts: (job.attempts || 0) + 1, updated_at: new Date().toISOString() }).eq('id', job.id);

    try {
      const externalReservationId = job.payload?.external_reservation_id || job.payload?.reservation_id || job.payload?.id;
      if (job.type === 'reservations' && externalReservationId) {
        const { data: existing } = await admin
          .from('ota_reservation_events')
          .select('id, duplicate_count')
          .eq('hotel_id', job.hotel_id)
          .eq('provider', job.provider)
          .eq('external_reservation_id', String(externalReservationId))
          .maybeSingle();

        if (existing) {
          duplicates += 1;
          await admin.from('ota_reservation_events').update({
            duplicate_count: Number(existing.duplicate_count || 0) + 1,
            last_seen_at: new Date().toISOString(),
            payload: job.payload || {},
          }).eq('id', existing.id);
          await admin.from('ota_sync_queue').update({ status: 'done', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id);
          await admin.from('ota_sync_logs').insert({ hotel_id: job.hotel_id, connection_id: job.connection_id, provider: job.provider, direction: job.direction, status: 'duplicate_ignored', payload: { queue_id: job.id, externalReservationId }, duration_ms: Date.now() - started });
          processed += 1;
          continue;
        }

        await admin.from('ota_reservation_events').insert({
          hotel_id: job.hotel_id,
          provider: job.provider,
          external_reservation_id: String(externalReservationId),
          status: 'received',
          payload: job.payload || {},
        });
      }

      await admin.from('ota_sync_logs').insert({ hotel_id: job.hotel_id, connection_id: job.connection_id, provider: job.provider, direction: job.direction, status: 'success', payload: { queue_id: job.id, type: job.type, processed_by: 'ota-worker' }, duration_ms: Date.now() - started });
      await admin.from('ota_sync_queue').update({ status: 'done', processed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', job.id);
      processed += 1;
    } catch (e) {
      failed += 1;
      const attempts = Number(job.attempts || 0) + 1;
      const nextStatus = attempts >= 5 ? 'failed' : 'retry';
      await admin.from('ota_sync_queue').update({ status: nextStatus, last_error: e instanceof Error ? e.message : 'Unknown error', updated_at: new Date().toISOString() }).eq('id', job.id);
      await admin.from('ota_sync_logs').insert({ hotel_id: job.hotel_id, connection_id: job.connection_id, provider: job.provider, direction: job.direction, status: nextStatus, errors: { message: e instanceof Error ? e.message : String(e) }, duration_ms: Date.now() - started });
    }
  }

  return NextResponse.json({ ok: true, processed, failed, duplicates });
}

export async function POST(request: Request) { return processQueue(request); }
export async function GET(request: Request) { return processQueue(request); }
