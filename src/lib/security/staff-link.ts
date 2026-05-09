import crypto from 'crypto';

type Payload = { hotelId: string; exp: number; jti: string };

function secret() {
  return process.env.STAFF_LINK_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret-change-me';
}

export function createStaffLoginToken(hotelId: string, ttlMinutes = 60 * 24 * 365) {
  const payload: Payload = {
    hotelId,
    exp: Date.now() + ttlMinutes * 60_000,
    jti: crypto.randomUUID(),
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function validateStaffLoginToken(token: string) {
  const [body, sig] = token.split('.');
  if (!body || !sig) return { ok: false as const, error: 'invalid_token' };
  const expected = crypto.createHmac('sha256', secret()).update(body).digest('base64url');
  if (sig !== expected) return { ok: false as const, error: 'bad_signature' };

  const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as Payload;
  if (!payload?.hotelId || !payload?.exp || !payload?.jti) return { ok: false as const, error: 'invalid_payload' };
  if (Date.now() > payload.exp) return { ok: false as const, error: 'expired' };
  return { ok: true as const, hotelId: payload.hotelId, exp: payload.exp };
}

// Backward-compatible alias for old call sites
export const consumeStaffLoginToken = validateStaffLoginToken;

