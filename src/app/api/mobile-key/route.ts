/**
 * Mobile Key API
 * Issues digital room keys via NFC/BLE
 *
 * Integration partners:
 * - ASSA ABLOY (VingCard) — https://www.assaabloy.com
 * - Dormakaba (KABA) — https://www.dormakaba.com
 * - Salto Systems — https://saltosystems.com
 * - MIWA (Japan) — https://www.miwa.co.jp
 *
 * Setup: Contact your door lock vendor → get API credentials
 * ENV: MOBILE_KEY_VENDOR=assa_abloy|dormakaba|salto
 *      MOBILE_KEY_API_URL=https://api.vendor.com
 *      MOBILE_KEY_API_KEY=xxx
 *      MOBILE_KEY_PROPERTY_ID=xxx
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
import crypto from 'crypto';

const MobileKeyIssueSchema = z.object({
  reservationCode: z.string().trim().min(3).max(64),
});

function validateDoorLockRequest(request: NextRequest) {
  const expected = process.env.MOBILE_KEY_VERIFY_SECRET;
  if (!expected) {
    return process.env.NODE_ENV === 'production'
      ? NextResponse.json({ error: 'MOBILE_KEY_VERIFY_SECRET is not configured' }, { status: 503 })
      : null;
  }

  const provided = request.headers.get('x-mobile-key-secret') || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (provided !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return null;
}

// Issue a new mobile key for a reservation
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'mobile-key.issue', 10, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, MobileKeyIssueSchema);
  if (parsed.error) return parsed.error;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { reservationCode } = parsed.data;
  const admin = createAdminClient();

  // Verify guest owns this reservation
  const { data: res } = await admin
    .from('reservations')
    .select('id, hotel_id, room_id, check_in, check_out, status, guest_account_id, rooms(room_number), hotels(name)')
    .eq('reservation_code', reservationCode)
    .eq('guest_account_id', user.id)
    .single();

  if (!res) return NextResponse.json({ error: 'ไม่พบการจอง' }, { status: 404 });
  if (!['confirmed', 'checked_in'].includes(res.status)) {
    return NextResponse.json({ error: 'การจองนี้ไม่สามารถออก key ได้' }, { status: 400 });
  }

  // Generate key token
  const keyToken = crypto.randomBytes(32).toString('hex');
  const validFrom  = new Date(`${res.check_in}T14:00:00+07:00`).toISOString();
  const validUntil = new Date(`${res.check_out}T12:00:00+07:00`).toISOString();

  // Revoke existing keys for this reservation
  await admin.from('mobile_keys').update({ revoked: true })
    .eq('reservation_id', res.id).eq('revoked', false);

  // Store new key
  const { data: key, error } = await admin.from('mobile_keys').insert({
    hotel_id: res.hotel_id,
    reservation_id: res.id,
    room_id: res.room_id,
    guest_account_id: user.id,
    key_token: keyToken,
    valid_from: validFrom,
    valid_until: validUntil,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Send to vendor if configured
  const vendorResult = await sendToVendor(keyToken, res, validFrom, validUntil);

  return NextResponse.json({
    success: true,
    key: {
      token: keyToken,
      id: key.id,
      roomNumber: (res.rooms as any)?.room_number,
      hotelName: (res.hotels as any)?.name,
      validFrom, validUntil,
      vendorConnected: vendorResult.connected,
      vendorMessage: vendorResult.message,
      // NFC payload (for Web NFC API)
      nfcPayload: Buffer.from(JSON.stringify({ t: keyToken, r: res.id.slice(0, 8) })).toString('base64'),
    },
  });
}

// Verify a key (called by door lock system)
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'mobile-key.verify', 120, 60_000);
  if (limited) return limited;

  const denied = validateDoorLockRequest(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const token  = searchParams.get('token');
  const roomId = searchParams.get('room');

  if (!token) return NextResponse.json({ valid: false });

  const admin = createAdminClient();
  const { data: key } = await admin
    .from('mobile_keys')
    .select('*, reservations(status)')
    .eq('key_token', token)
    .eq('revoked', false)
    .single();

  if (!key) return NextResponse.json({ valid: false, reason: 'Key not found' });
  if (roomId && key.room_id !== roomId) return NextResponse.json({ valid: false, reason: 'Wrong room' });

  const now = new Date();
  if (now < new Date(key.valid_from)) return NextResponse.json({ valid: false, reason: 'Too early' });
  if (now > new Date(key.valid_until)) return NextResponse.json({ valid: false, reason: 'Expired' });

  // Update last_used
  await admin.from('mobile_keys').update({ last_used_at: now.toISOString() }).eq('id', key.id);

  return NextResponse.json({ valid: true, roomId: key.room_id });
}

async function sendToVendor(token: string, reservation: any, validFrom: string, validUntil: string) {
  const vendor = process.env.MOBILE_KEY_VENDOR;
  const apiUrl = process.env.MOBILE_KEY_API_URL;
  const apiKey = process.env.MOBILE_KEY_API_KEY;

  if (!vendor || !apiUrl || !apiKey) {
    return { connected: false, message: 'Vendor not configured — key stored in DB only. Configure MOBILE_KEY_* env vars to enable NFC/BLE door unlock.' };
  }

  try {
    // Generic vendor call — adapt per vendor SDK
    const res = await fetch(`${apiUrl}/keys/issue`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        propertyId: process.env.MOBILE_KEY_PROPERTY_ID,
        roomNumber: (reservation.rooms as any)?.room_number,
        keyToken: token,
        validFrom, validUntil,
        format: 'ble', // ble | nfc | both
      }),
    });
    if (res.ok) return { connected: true, message: `Key issued via ${vendor}` };
    return { connected: false, message: `Vendor error: ${res.status}` };
  } catch (err: any) {
    return { connected: false, message: err.message };
  }
}
