import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { ACCESS_POLICIES } from '@/lib/security/access-policies';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

const ROUTE_ROLES: Array<{ prefix: string; roles: string[] }> = [
  { prefix: '/dashboard/audit', roles: ['owner', 'admin'] },
  { prefix: '/dashboard/system', roles: ['owner', 'admin'] },
  { prefix: '/dashboard/launch', roles: ['owner', 'admin'] },
  { prefix: '/dashboard/go-live', roles: ['owner', 'admin'] },
  { prefix: '/dashboard/branding', roles: ['owner', 'admin'] },
  { prefix: '/dashboard/accounting', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/reports', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/rates', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/channels', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/marketing', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/fb', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/spa', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/loyalty', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/settings', roles: ['owner', 'admin', 'manager'] },
  { prefix: '/dashboard/maintenance', roles: ['owner', 'admin', 'manager', 'maintenance'] },
  { prefix: '/dashboard/concierge', roles: ['owner', 'admin', 'manager', 'concierge'] },
  { prefix: '/dashboard/security', roles: ['owner', 'admin', 'manager', 'security'] },
  { prefix: '/dashboard/accounting-ops', roles: ['owner', 'admin', 'accounting'] },
  { prefix: '/dashboard/rbac', roles: ['owner', 'admin'] },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const portalHost = process.env.NEXT_PUBLIC_PORTAL_HOST;
  const backofficeHost = process.env.NEXT_PUBLIC_BACKOFFICE_HOST;
  const host = request.nextUrl.host;

  // Optional host split: serve portal and backoffice on separate domains
  if (portalHost && backofficeHost) {
    const isPortalPath = pathname.startsWith('/portal');
    const subdomainEnabled = process.env.NEXT_PUBLIC_BACKOFFICE_SUBDOMAIN_ENABLED === 'true';
    const backofficeHostAllowed = subdomainEnabled
      ? (host === backofficeHost || host.endsWith(`.${backofficeHost}`))
      : host === backofficeHost;

    if (isPortalPath) {
      if (host !== portalHost) {
        const url = request.nextUrl.clone();
        url.host = portalHost;
        return NextResponse.redirect(url);
      }
    } else if (!backofficeHostAllowed) {
      const url = request.nextUrl.clone();
      url.host = backofficeHost;
      return NextResponse.redirect(url);
    }
  }


  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();




  // ─── Access policy enforcement (session timeout + 2FA baseline) ───
  if (user && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin') || pathname.startsWith('/backoffice'))) {
    const { data: policyProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    const role = (policyProfile?.role || 'staff') as keyof typeof ACCESS_POLICIES.sessionTimeoutMinutes;
    const timeoutMin = ACCESS_POLICIES.sessionTimeoutMinutes[role] || ACCESS_POLICIES.sessionTimeoutMinutes.staff;
    const signedAt = user.last_sign_in_at ? new Date(user.last_sign_in_at).getTime() : Date.now();
    const expired = (Date.now() - signedAt) > timeoutMin * 60_000;
    if (expired) {
      return NextResponse.redirect(new URL('/api/auth/logout?next=/backoffice/login?error=session_expired', request.url));
    }

    if (ACCESS_POLICIES.require2FA.includes(role as any)) {
      const mfaVerified = Boolean((user.user_metadata as any)?.mfa_verified);
      if (!mfaVerified) {
        return NextResponse.redirect(new URL('/backoffice/login?error=2fa_required', request.url));
      }
    }
  }

  // ─── Separate customer portal vs internal backoffice ─────────────
  if (pathname.startsWith('/backoffice') || pathname.startsWith('/auth') || pathname.startsWith('/portal/login')) {
    if (user) {
      const [{ data: profile }, { data: guestAccount }] = await Promise.all([
        supabase.from('user_profiles').select('id').eq('id', user.id).maybeSingle(),
        supabase.from('guest_accounts').select('id').eq('id', user.id).maybeSingle(),
      ]);

      if ((pathname.startsWith('/backoffice') || pathname.startsWith('/auth')) && guestAccount) {
        return NextResponse.redirect(new URL('/portal/bookings', request.url));
      }

      if (pathname.startsWith('/portal/login') && profile) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
  }

  // ─── Web admin area ─────────────────────────────────────────────
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    if (!user) return NextResponse.redirect(new URL('/admin/login', request.url));

    const { data: adminProfile } = await supabase
      .from('user_profiles')
      .select('role, active')
      .eq('id', user.id)
      .maybeSingle();

    if (!adminProfile || !adminProfile.active || !['owner', 'admin'].includes(adminProfile.role || '')) {
      return NextResponse.redirect(new URL('/backoffice/login?error=forbidden', request.url));
    }
  }

  // ─── Hotel staff dashboard ───────────────────────────────────────
  if (pathname.startsWith('/dashboard')) {
    if (!user) return NextResponse.redirect(new URL('/backoffice/login', request.url));
    // Make sure they're hotel staff (not a guest account)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('id, organization_id, role, active, onboarding_completed')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.redirect(new URL('/onboarding', request.url));
    if (!profile.active) return NextResponse.redirect(new URL('/backoffice/login?error=inactive', request.url));
    if (!profile.organization_id) return NextResponse.redirect(new URL('/onboarding', request.url));

    const { data: hotel } = await supabase
      .from('hotels')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .limit(1)
      .maybeSingle();

    if (!hotel) return NextResponse.redirect(new URL('/onboarding', request.url));

    const [{ data: roomType }, { data: room }] = await Promise.all([
      supabase.from('room_types').select('id').eq('hotel_id', hotel.id).limit(1).maybeSingle(),
      supabase.from('rooms').select('id').eq('hotel_id', hotel.id).limit(1).maybeSingle(),
    ]);

    if (!profile.onboarding_completed || !roomType || !room) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    const routeRule = ROUTE_ROLES.find(rule => pathname.startsWith(rule.prefix));
    if (routeRule && !routeRule.roles.includes(profile.role || 'staff')) {
      return NextResponse.redirect(new URL('/dashboard?error=forbidden', request.url));
    }
  }

  // ─── Guest portal (account required pages) ───────────────────────
  const guestProtected = ['/portal/bookings', '/portal/profile', '/portal/wishlist'];
  if (guestProtected.some(p => pathname.startsWith(p))) {
    if (!user) {
      const redirectUrl = new URL('/portal/login', request.url);
      redirectUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(redirectUrl);
    }
    // Verify they have a guest_account row
    const { data: guestAccount } = await supabase
      .from('guest_accounts')
      .select('id')
      .eq('id', user.id)
      .single();
    if (!guestAccount) {
      return NextResponse.redirect(new URL('/portal/login', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/portal/bookings/:path*',
    '/portal/profile/:path*',
    '/portal/wishlist/:path*',
    '/admin/:path*',
    '/auth/:path*',
    '/backoffice/:path*',
    '/portal/login',
  ],
};
