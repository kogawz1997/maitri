/**
 * OTA Channel Sync Cron — runs every 15 minutes
 * Pulls new bookings from connected OTAs and pushes availability
 *
 * Current OTA integrations:
 * - Booking.com: Partner API (needs certification)
 * - Agoda: YCS API (needs property login)
 * - Airbnb: API (needs approval program)
 * - Expedia: EQC API
 * - Traveloka: Partner Portal API
 *
 * Status: Booking.com + Agoda webhooks parse real payloads.
 * Push (availability/rate update) requires vendor API keys per property.
 * Set: CHANNEL_{VENDOR}_API_KEY, CHANNEL_{VENDOR}_PROPERTY_ID per hotel.
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { handleChannelConflict } from '@/lib/channel-manager/conflict';

export async function GET(request: NextRequest) {
  const err = requireCronSecret(request);
  if (err) return err;

  const admin = createAdminClient();
  const results: any[] = [];

  // Get all active channel connections
  const { data: channels } = await admin
    .from('channel_connections')
    .select('*, hotels(id, name, organization_id)')
    .eq('status', 'active');

  for (const ch of channels || []) {
    const hotel  = ch.hotels as any;
    const provider = ch.channel || ch.provider || ch.channel_type;
    const credentials = ch.credentials || {};
    const normalizedChannel = {
      ...ch,
      channel_type: provider,
      api_key: credentials.api_key || ch.api_key,
      property_id: ch.external_property_id || credentials.property_id || ch.property_id,
    };
    const result = { channel: provider, hotel: hotel?.name || hotel?.id || 'unknown', pulled: 0, pushed: 0, errors: [] as string[] };

    if (!normalizedChannel.api_key || !normalizedChannel.property_id) {
      const msg = `[OTA Sync] Skipping ${provider} for hotel=${hotel?.id || 'unknown'} (missing api_key/property_id)`;
      console.info(msg);
      result.errors.push('Skipped: missing API credentials/property id');
      results.push(result);
      continue;
    }

    try {
      // Pull new bookings from OTA
      const newBookings = await pullFromOTA(normalizedChannel);
      for (const booking of newBookings) {
        await processOTABooking(admin, hotel.id, provider, booking, result);
      }

      // Push availability to OTA
      const pushed = await pushAvailability(normalizedChannel, hotel.id, admin);
      result.pushed = pushed;

      // Update sync timestamp
      await admin.from('channel_connections').update({ last_sync_at: new Date().toISOString(), last_error: null }).eq('id', ch.id);

    } catch (err: any) {
      result.errors.push(err.message);
      await admin.from('channel_connections').update({ last_error: err.message }).eq('id', ch.id);
    }

    results.push(result);
  }

  return NextResponse.json({ success: true, synced: results.length, results });
}

async function pullFromOTA(channel: any): Promise<any[]> {
  // Each OTA has different pull mechanism
  // Booking.com: uses webhooks (push model) — no pull needed here
  // Agoda: YCS API pull — requires property_id + api_key from Agoda partner portal
  // Airbnb: requires approved API access program
  // Expedia: EQC API requires signed partner agreement

  if (!channel.api_key || !channel.property_id) {
    // Not configured yet — this is expected for new hotels
    // Log but don't treat as error
    console.info(`[OTA Sync] ${channel.channel_type}: not configured (no api_key/property_id) — skipping`);
    return [];
  }

  // Placeholder — actual implementation per-vendor
  // In production: call vendor REST API with credentials from channel.config
  return [];
}

async function processOTABooking(admin: any, hotelId: string, channelType: string, booking: any, result: any) {
  // Check for duplicate
  const { data: existing } = await admin.from('reservations')
    .select('id').eq('channel_booking_id', booking.id).eq('hotel_id', hotelId).single();

  if (existing) return; // Already imported

  // Check for conflict (same room, overlapping dates)
  const conflict = await handleChannelConflict(admin, hotelId, booking);

  if (conflict.hasConflict) {
    result.errors.push(`Conflict: ${booking.id} — ${conflict.reason}`);
    await admin.from('audit_logs').insert({
      hotel_id: hotelId,
      action: 'channel.booking_conflict',
      entity_type: 'reservation',
      changes: { channel: channelType, booking_id: booking.id, conflict: conflict.reason },
    });
    return;
  }

  result.pulled++;
}

async function pushAvailability(channel: any, hotelId: string, admin: any): Promise<number> {
  if (!channel.api_key || !channel.property_id) return 0;
  // Push current availability to OTA
  // Actual call differs per vendor SDK
  return 0;
}
