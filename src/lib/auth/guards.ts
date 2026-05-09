/**
 * Auth Guards — centralized hotel access verification
 * Use in every API route that touches hotel data
 */
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/server';

export type StaffRole = 'owner' | 'admin' | 'manager' | 'front_desk' | 'receptionist' | 'housekeeping' | 'staff' | 'viewer';

export interface HotelContext {
  user: { id: string; email: string };
  profile: { id: string; role: StaffRole; organization_id: string };
  hotelId: string;
  hotel?: any;
  supabase: ReturnType<typeof createAdminClient>;
  error: null;
}

export interface HotelContextError {
  error: NextResponse;
  user?: never;
  profile?: never;
  hotelId?: never;
  hotel?: never;
  supabase?: never;
}

/**
 * Verify staff has access to hotelId and optionally check role
 * Returns context with supabase admin client scoped to hotel
 */
export async function requireHotelAccess(
  hotelId: string | null,
  allowedRoles?: StaffRole[]
): Promise<HotelContext | HotelContextError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return { error: NextResponse.json({ error: 'Profile not found' }, { status: 403 }) };
  }

  // Verify hotel belongs to user's organization. If hotelId is not supplied, use the first hotel in the org.
  let hotelQuery = admin
    .from('hotels')
    .select('*')
    .eq('organization_id', profile.organization_id);

  if (hotelId) {
    hotelQuery = hotelQuery.eq('id', hotelId);
  }

  const { data: hotel } = await hotelQuery.limit(1).single();

  if (!hotel) {
    return { error: NextResponse.json({ error: 'Hotel not found or access denied' }, { status: 403 }) };
  }

  // Check role if specified
  if (allowedRoles && !allowedRoles.includes(profile.role as StaffRole)) {
    return { error: NextResponse.json({ error: `Required role: ${allowedRoles.join(' or ')}`, yourRole: profile.role }, { status: 403 }) };
  }

  return {
    user: { id: user.id, email: user.email || '' },
    profile: profile as any,
    hotelId: hotel.id,
    hotel,
    supabase: admin,
    error: null,
  };
}

/**
 * Require platform owner/super-admin access
 * For Owner Panel only
 */
export async function requirePlatformAdmin(): Promise<{ user: any; supabase: any; error: null } | HotelContextError> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('user_profiles').select('role, is_platform_admin').eq('id', user.id).single();

  if (!profile?.is_platform_admin) {
    return { error: NextResponse.json({ error: 'Platform admin access required' }, { status: 403 }) };
  }

  return { user, supabase: admin, error: null };
}

/**
 * Require CRON_SECRET for cron jobs
 */
export function requireCronSecret(request: Request): NextResponse | null {
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function requireUser(): Promise<{
  user: { id: string; email: string } | null;
  profile: { id: string; role: StaffRole; organization_id: string } | null;
  supabase: ReturnType<typeof createAdminClient>;
  error: NextResponse | null;
}> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, profile: null, supabase: createAdminClient(), error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('user_profiles')
    .select('id, role, organization_id')
    .eq('id', user.id)
    .single();

  return {
    user: { id: user.id, email: user.email || '' },
    profile: (profile as any) || null,
    supabase: admin,
    error: null,
  };
}

export async function assertReservationAccess(reservationId: string): Promise<{
  user: { id: string; email: string } | null;
  profile: { id: string; role: StaffRole; organization_id: string } | null;
  hotelId: string | null;
  reservation: any | null;
  supabase: ReturnType<typeof createAdminClient>;
  error: NextResponse | null;
}> {
  const base = await requireUser();
  if (base.error) return { ...base, hotelId: null, reservation: null };
  if (!base.profile) {
    return { ...base, hotelId: null, reservation: null, error: NextResponse.json({ error: 'Profile not found' }, { status: 403 }) };
  }

  const { data: reservation } = await base.supabase
    .from('reservations')
    .select('*, hotels(id, organization_id, name, email, phone, address, currency)')
    .eq('id', reservationId)
    .single();

  if (!reservation) {
    return { ...base, hotelId: null, reservation: null, error: null };
  }

  if (reservation.hotels?.organization_id !== base.profile.organization_id) {
    return { ...base, hotelId: null, reservation: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return {
    user: base.user,
    profile: base.profile,
    hotelId: reservation.hotel_id,
    reservation,
    supabase: base.supabase,
    error: null,
  };
}
