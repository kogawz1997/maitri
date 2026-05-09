import crypto from 'crypto';
import { getClientIp } from '@/lib/security/rate-limit';

export const GUEST_LOGIN_FAILURE_LIMIT = 5;
export const GUEST_LOGIN_LOCK_WINDOW_MS = 15 * 60 * 1000;

export type AuthAuditInput = {
  action: string;
  email?: string | null;
  entityId?: string | null;
  success?: boolean;
  reason?: string | null;
  metadata?: Record<string, unknown>;
};

export function normalizeAuthEmail(email?: string | null) {
  return String(email || '').trim().toLowerCase();
}

export function getRequestDevice(request: Request) {
  const ip = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const acceptLanguage = request.headers.get('accept-language') || 'unknown';
  const fingerprint = crypto
    .createHash('sha256')
    .update(`${ip}|${userAgent}|${acceptLanguage}`)
    .digest('hex')
    .slice(0, 32);

  return { ip, userAgent, acceptLanguage, fingerprint };
}

export async function recordAuthAudit(admin: any, request: Request, input: AuthAuditInput) {
  const device = getRequestDevice(request);
  const email = normalizeAuthEmail(input.email);

  try {
    await admin.from('audit_logs').insert({
      hotel_id: null,
      user_id: null,
      action: input.action,
      entity_type: 'guest_auth',
      entity_id: input.entityId || null,
      ip_address: device.ip,
      user_agent: device.userAgent,
      changes: {
        email: email || null,
        success: input.success ?? null,
        reason: input.reason || null,
        device_fingerprint: device.fingerprint,
        accept_language: device.acceptLanguage,
        ...(input.metadata || {}),
      },
    });
  } catch (error) {
    console.error('[auth-audit] failed to record auth audit event', error);
  }
}

export async function getRecentGuestLoginFailureCount(admin: any, email: string) {
  const normalizedEmail = normalizeAuthEmail(email);
  if (!normalizedEmail) return 0;

  const since = new Date(Date.now() - GUEST_LOGIN_LOCK_WINDOW_MS).toISOString();
  const { data, error } = await admin
    .from('audit_logs')
    .select('id')
    .eq('action', 'guest.auth.login.failed')
    .gte('created_at', since)
    .contains('changes', { email: normalizedEmail })
    .limit(GUEST_LOGIN_FAILURE_LIMIT);

  if (error) {
    console.error('[auth-audit] failed to inspect recent login failures', error.message || error);
    return 0;
  }

  return data?.length || 0;
}

export async function checkGuestBruteForceLock(admin: any, email: string) {
  const failureCount = await getRecentGuestLoginFailureCount(admin, email);
  return {
    locked: failureCount >= GUEST_LOGIN_FAILURE_LIMIT,
    failureCount,
    retryAfterSeconds: Math.ceil(GUEST_LOGIN_LOCK_WINDOW_MS / 1000),
  };
}

export async function recordGuestLoginSuccess(admin: any, request: Request, input: { email: string; guestId: string }) {
  const normalizedEmail = normalizeAuthEmail(input.email);
  const currentDevice = getRequestDevice(request);

  try {
    const { data: previous } = await admin
      .from('audit_logs')
      .select('id, ip_address, user_agent, changes, created_at')
      .eq('action', 'guest.auth.login.success')
      .contains('changes', { email: normalizedEmail })
      .order('created_at', { ascending: false })
      .limit(1);

    const last = previous?.[0];
    if (last?.ip_address && last.ip_address !== currentDevice.ip) {
      await recordAuthAudit(admin, request, {
        action: 'guest.auth.ip_anomaly',
        email: normalizedEmail,
        entityId: input.guestId,
        success: true,
        reason: 'ip_changed_since_last_successful_login',
        metadata: {
          previous_ip: last.ip_address,
          previous_user_agent: last.user_agent || null,
          previous_login_at: last.created_at || null,
        },
      });
    }
  } catch (error) {
    console.error('[auth-audit] failed to inspect previous login device', error);
  }

  await recordAuthAudit(admin, request, {
    action: 'guest.auth.login.success',
    email: normalizedEmail,
    entityId: input.guestId,
    success: true,
    metadata: { session_device_tracked: true },
  });
}
