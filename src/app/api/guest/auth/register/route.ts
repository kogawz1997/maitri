import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { RegisterSchema, RATE_LIMITS } from '@/lib/validation';
import { parseJson, dbError } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
import { recordAuthAudit } from '@/lib/security/auth-activity';
import { createClient, createAdminClient } from '@/lib/supabase/server';

const GuestRegisterSchema = RegisterSchema.extend({
  marketingConsent: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.auth.register', RATE_LIMITS.register.limit, RATE_LIMITS.register.windowMs);
  if (limited) return limited;

  const parsed = await parseJson(request, GuestRegisterSchema);
  if (parsed.error) return parsed.error;

  const { email, password, firstName, lastName, phone, marketingConsent } = parsed.data;
  const admin = createAdminClient();
  const supabase = await createClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/portal/login?verified=1`,
      data: { full_name: `${firstName} ${lastName || ''}`.trim(), user_type: 'guest' },
    },
  });

  if (authError) {
    await recordAuthAudit(admin, request, {
      action: 'guest.auth.register.failed',
      email,
      success: false,
      reason: authError.message,
    });
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  if (!authData.user) {
    await recordAuthAudit(admin, request, {
      action: 'guest.auth.register.failed',
      email,
      success: false,
      reason: 'supabase_user_missing',
    });
    return NextResponse.json({ error: 'สมัครไม่สำเร็จ' }, { status: 500 });
  }

  const { error } = await admin.from('guest_accounts').insert({
    id: authData.user.id,
    email,
    first_name: firstName,
    last_name: lastName || null,
    phone: phone || null,
    marketing_consent: marketingConsent || false,
  });

  if (error) {
    await recordAuthAudit(admin, request, {
      action: 'guest.auth.register.failed',
      email,
      entityId: authData.user.id,
      success: false,
      reason: error.code || 'guest_account_insert_failed',
    });
    return dbError(error);
  }

  await recordAuthAudit(admin, request, {
    action: 'guest.auth.register.success',
    email,
    entityId: authData.user.id,
    success: true,
    metadata: { email_verification_redirect: `${appUrl}/portal/login?verified=1` },
  });

  return NextResponse.json({ success: true });
}
