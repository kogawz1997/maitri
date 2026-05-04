import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export type AppRole = 'owner' | 'admin' | 'manager' | 'front_desk' | 'housekeeping' | 'staff';

export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return { supabase, user: null, profile: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id, organization_id, email, full_name, role, active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.active === false) {
    return { supabase, user, profile: null, error: NextResponse.json({ error: 'Profile not found or inactive' }, { status: 403 }) };
  }

  return { supabase, user, profile, error: null };
}

export async function requireHotelAccess(hotelId?: string | null, allowedRoles?: AppRole[]) {
  const ctx = await requireUser();
  if (ctx.error || !ctx.profile) return { ...ctx, hotel: null, hotelId: null };

  if (allowedRoles && !allowedRoles.includes(ctx.profile.role as AppRole)) {
    return { ...ctx, hotel: null, hotelId: null, error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  let query = ctx.supabase
    .from('hotels')
    .select('id, name, organization_id, currency, timezone, check_in_time, check_out_time, address, tax_id, vat_rate')
    .eq('organization_id', ctx.profile.organization_id);

  if (hotelId) query = query.eq('id', hotelId);

  const { data: hotel, error } = await query.limit(1).single();
  if (error || !hotel) {
    return { ...ctx, hotel: null, hotelId: null, error: NextResponse.json({ error: 'Hotel access denied' }, { status: 403 }) };
  }

  return { ...ctx, hotel, hotelId: hotel.id, error: null };
}

export async function assertReservationAccess(reservationId: string) {
  const ctx = await requireUser();
  if (ctx.error || !ctx.profile) return { ...ctx, reservation: null };

  const { data: reservation, error } = await ctx.supabase
    .from('reservations')
    .select('*, hotels(id, name, organization_id, currency, timezone, check_in_time, check_out_time, address, tax_id, vat_rate)')
    .eq('id', reservationId)
    .single();

  if (error || !reservation || reservation.hotels?.organization_id !== ctx.profile.organization_id) {
    return { ...ctx, reservation: null, error: NextResponse.json({ error: 'Reservation not found' }, { status: 404 }) };
  }

  return { ...ctx, reservation, error: null };
}
