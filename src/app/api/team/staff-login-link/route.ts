import { NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createStaffLoginToken } from '@/lib/security/staff-link';
import { rateLimit } from '@/lib/security/rate-limit';

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'team.staff-login-link', 5, 60_000);
  if (limited) return limited;

  const ctx = await requireHotelAccess(null, ['owner']);
  if (ctx.error) return ctx.error;
  if (!ctx.profile || !ctx.hotelId) return NextResponse.json({ error: 'Profile not found' }, { status: 403 });

  const { data: hotel } = await ctx.supabase
    .from('hotels')
    .select('slug')
    .eq('id', ctx.hotelId)
    .maybeSingle();

  const backofficeHost = process.env.NEXT_PUBLIC_BACKOFFICE_HOST;
  const subdomainEnabled = process.env.NEXT_PUBLIC_BACKOFFICE_SUBDOMAIN_ENABLED === 'true';

  const appUrl = backofficeHost
    ? (subdomainEnabled && hotel?.slug
      ? `https://${hotel.slug}.${backofficeHost}`
      : `https://${backofficeHost}`)
    : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');

  const expiresInMinutes = Number(process.env.STAFF_LOGIN_LINK_TTL_MINUTES || 15);
  const token = createStaffLoginToken(ctx.hotelId, expiresInMinutes);
  const loginUrl = `${appUrl}/backoffice/login?hotel=${ctx.hotelId}&token=${token}`;
  return NextResponse.json({ success: true, loginUrl, hotelId: ctx.hotelId, hotelSlug: hotel?.slug || null, subdomainEnabled, expiresInMinutes });
}
