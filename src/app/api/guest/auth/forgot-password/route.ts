import { NextRequest, NextResponse } from 'next/server';
import { ForgotPasswordSchema, RATE_LIMITS } from '@/lib/validation';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';
import { recordAuthAudit } from '@/lib/security/auth-activity';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.auth.forgot-password', RATE_LIMITS.passwordReset.limit, RATE_LIMITS.passwordReset.windowMs);
  if (limited) return limited;

  const parsed = await parseJson(request, ForgotPasswordSchema);
  if (parsed.error) return parsed.error;

  const { email } = parsed.data;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const supabase = await createClient();
  const admin = createAdminClient();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/portal/reset-password`,
  });

  await recordAuthAudit(admin, request, {
    action: 'guest.auth.password_reset.requested',
    email,
    success: true,
  });

  return NextResponse.json({ success: true });
}
