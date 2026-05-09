import crypto from 'crypto';

export function timingSafeEqualText(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

export function verifyBearerOrHeaderToken(token: string | null | undefined, expected: string | undefined) {
  if (!expected || !token) return false;
  return timingSafeEqualText(token, expected);
}

export function readWebhookToken(request: Request) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.headers.get('x-maitri-webhook-token') || '';
}

export function verifyHmacSha256(rawBody: string, signature: string | null | undefined, secret: string | undefined, prefix = '') {
  if (!secret || !signature) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const normalized = signature.replace(/^sha256=/i, '').replace(prefix, '');
  return timingSafeEqualText(normalized, expected);
}

export function assertWebhookFresh(timestampHeader: string | null, maxSkewSeconds = 300) {
  if (!timestampHeader) return false;
  const ts = Number(timestampHeader);
  if (!Number.isFinite(ts)) return false;
  const millis = ts > 10_000_000_000 ? ts : ts * 1000;
  return Math.abs(Date.now() - millis) <= maxSkewSeconds * 1000;
}
