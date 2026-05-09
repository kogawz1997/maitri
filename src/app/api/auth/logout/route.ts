import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { recordAuthAudit } from '@/lib/security/auth-activity';

async function performLogout(request: Request) {
  const limited = await rateLimit(request, 'auth.logout', 30, 60_000);
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.auth.signOut();

  if (user?.email) {
    const admin = createAdminClient();
    await recordAuthAudit(admin, request, {
      action: 'auth.logout.success',
      email: user.email,
      entityId: user.id,
      success: true,
    });
  }

  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/backoffice/login';
  return NextResponse.redirect(new URL(next, request.url));
}

export async function GET(request: Request) {
  return performLogout(request);
}

export async function POST(request: Request) {
  return performLogout(request);
}
