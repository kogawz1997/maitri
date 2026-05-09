import { NextRequest, NextResponse } from 'next/server';
import { LoginSchema, RATE_LIMITS } from '@/lib/validation';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
import {
  checkGuestBruteForceLock,
  recordAuthAudit,
  recordGuestLoginSuccess,
} from '@/lib/security/auth-activity';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.auth.login', RATE_LIMITS.login.limit, RATE_LIMITS.login.windowMs);
  if (limited) return limited;

  const parsed = await parseJson(request, LoginSchema);
  if (parsed.error) return parsed.error;

  const { email, password } = parsed.data;
  const admin = createAdminClient();

  const lock = await checkGuestBruteForceLock(admin, email);
  if (lock.locked) {
    await recordAuthAudit(admin, request, {
      action: 'guest.auth.login.blocked',
      email,
      success: false,
      reason: 'too_many_recent_failures',
      metadata: { failure_count: lock.failureCount },
    });

    return NextResponse.json(
      { error: 'พยายามเข้าสู่ระบบหลายครั้งเกินไป กรุณารอสักครู่แล้วลองใหม่', retryAfter: lock.retryAfterSeconds },
      { status: 429, headers: { 'Retry-After': String(lock.retryAfterSeconds) } },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordAuthAudit(admin, request, {
      action: 'guest.auth.login.failed',
      email,
      success: false,
      reason: 'invalid_credentials',
    });
    return NextResponse.json({ error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' }, { status: 401 });
  }

  const { data: guestAccount } = await admin
    .from('guest_accounts')
    .select('id,first_name,last_name')
    .eq('id', data.user.id)
    .single();

  if (!guestAccount) {
    await supabase.auth.signOut();
    await recordAuthAudit(admin, request, {
      action: 'guest.auth.login.failed',
      email,
      entityId: data.user.id,
      success: false,
      reason: 'not_guest_account',
    });
    return NextResponse.json({ error: 'บัญชีนี้เป็นบัญชีโรงแรม กรุณาเข้าที่ /auth/login' }, { status: 403 });
  }

  await recordGuestLoginSuccess(admin, request, {
    email,
    guestId: data.user.id,
  });

  return NextResponse.json({ success: true, guest: guestAccount });
}
