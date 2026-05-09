/**
 * IoT Energy Management API
 *
 * Supported protocols:
 * - MQTT (most common) — mosquitto, HiveMQ
 * - REST polling — simpler, works with any HTTP device
 * - Webhook push — device pushes readings to us
 *
 * Integration partners:
 * - Tuya Smart — https://developer.tuya.com (most Thai hotels)
 * - Schneider EcoStruxure — enterprise
 * - Delta Controls — hotel-specific BMS
 * - KNX protocol — European standard
 *
 * Setup: MQTT_BROKER_URL=mqtt://broker.hotel.com
 *        MQTT_USERNAME=xxx MQTT_PASSWORD=xxx
 *        IOT_WEBHOOK_SECRET=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const IotReadingSchema = z.object({
  deviceId: z.string().trim().min(1).max(120),
  metric: z.string().trim().min(1).max(80),
  value: z.union([z.number(), z.string(), z.boolean()]),
  unit: z.string().trim().max(32).optional().nullable(),
});

const IotCommandSchema = z.object({
  hotelId: z.string().uuid(),
  deviceId: z.string().trim().min(1).max(120),
  command: z.string().trim().min(1).max(80),
  value: z.union([z.number(), z.string(), z.boolean(), z.record(z.any())]).optional(),
});

// GET — device list + current status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get('hotelId') || '';
  const ctx = await requireHotelAccess(hotelId);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  const { data: devices } = await admin
    .from('iot_devices')
    .select('*, rooms(room_number, floor)')
    .eq('hotel_id', hotelId)
    .order('device_type');

  // Latest reading per device
  const deviceIds = devices?.map(d => d.id) || [];
  const { data: readings } = deviceIds.length > 0
    ? await admin.from('iot_readings')
        .select('device_id, metric, value, unit, recorded_at')
        .in('device_id', deviceIds)
        .gte('recorded_at', new Date(Date.now() - 3600000).toISOString()) // last 1h
        .order('recorded_at', { ascending: false })
    : { data: [] };

  // Group readings by device
  const readingMap: Record<string, any[]> = {};
  readings?.forEach(r => {
    if (!readingMap[r.device_id]) readingMap[r.device_id] = [];
    readingMap[r.device_id].push(r);
  });

  return NextResponse.json({
    devices: (devices || []).map(d => ({
      ...d,
      latestReadings: readingMap[d.id] || [],
    })),
  });
}

// POST — receive webhook from IoT device / push reading
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'iot.webhook', 300, 60_000);
  if (limited) return limited;

  // Verify webhook secret. Production fails closed if IOT_WEBHOOK_SECRET is missing.
  const secret = request.headers.get('x-iot-secret');
  if (!process.env.IOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'IOT_WEBHOOK_SECRET is not configured' }, { status: 503 });
  }
  if (secret !== process.env.IOT_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJson(request, IotReadingSchema);
  if (parsed.error) return parsed.error;
  const { deviceId, metric, value, unit } = parsed.data;

  const admin = createAdminClient();

  // Update device last_seen
  await admin.from('iot_devices')
    .update({ last_seen: new Date().toISOString(), status: 'online' })
    .eq('device_id', deviceId);

  // Insert reading
  const { data: device } = await admin.from('iot_devices').select('id').eq('device_id', deviceId).single();
  if (device) {
    await admin.from('iot_readings').insert({ device_id: device.id, metric, value: Number(value), unit });
  }

  // Auto-action: if AC in vacant room and temp reading arrives, suggest turn off
  if (metric === 'temperature' || metric === 'motion') {
    await checkAutoActions(admin, deviceId, metric, value);
  }

  return NextResponse.json({ success: true });
}

// PATCH — send command to device
export async function PATCH(request: NextRequest) {
  const limited = await rateLimit(request, 'iot.command', 30, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, IotCommandSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, deviceId, command, value } = parsed.data;

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager', 'housekeeping']);
  if (ctx.error) return ctx.error;

  // Send command to device via vendor API
  const vendorUrl  = process.env.IOT_VENDOR_API_URL;
  const vendorKey  = process.env.IOT_VENDOR_API_KEY;

  if (!vendorUrl || !vendorKey) {
    return NextResponse.json({
      success: false,
      message: 'IOT_VENDOR_API_URL and IOT_VENDOR_API_KEY not configured',
      hint: 'For Tuya: IOT_VENDOR_API_URL=https://openapi.tuyaeu.com, IOT_VENDOR_API_KEY=your_access_id',
    }, { status: 503 });
  }

  try {
    const res = await fetch(`${vendorUrl}/v1.0/devices/${deviceId}/commands`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${vendorKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ commands: [{ code: command, value }] }),
    });
    const data = await res.json();
    return NextResponse.json({ success: res.ok, vendorResponse: data }, { status: res.ok ? 200 : 502 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

async function checkAutoActions(admin: any, deviceId: string, metric: string, value: any) {
  // Auto energy saving: no motion + AC running → suggest turn off
  if (metric === 'motion' && value === 0) {
    const { data: device } = await admin.from('iot_devices')
      .select('id, room_id, hotel_id').eq('device_id', deviceId).single();
    if (!device?.room_id) return;

    const today = new Date().toISOString().slice(0, 10);
    const { count } = await admin.from('reservations')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', device.room_id)
      .lte('check_in', today).gte('check_out', today)
      .in('status', ['confirmed', 'checked_in']);

    if (count === 0) {
      // Room is vacant — log for energy report
      await admin.from('audit_logs').insert({
        hotel_id: device.hotel_id,
        action: 'iot.vacant_room_ac_alert',
        entity_type: 'room',
        entity_id: device.room_id,
        changes: { deviceId, metric, value, suggestion: 'Turn off AC — room is vacant' },
      });
    }
  }
}
