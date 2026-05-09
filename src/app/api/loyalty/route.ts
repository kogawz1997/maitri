/**
 * Multi-property Loyalty Program API
 * Points earned at any hotel in the organization
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const LoyaltyEarnSchema = z.object({
  reservationId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

// Get member info
export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'loyalty.read', 60, 60_000);
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: member } = await admin
    .from('loyalty_members')
    .select('*, loyalty_programs(program_name, points_per_thb, thb_per_point, tiers)')
    .eq('guest_account_id', user.id)
    .single();

  if (!member) return NextResponse.json({ member: null, message: 'No loyalty membership found' });

  const { data: txs } = await admin
    .from('loyalty_transactions')
    .select('*, hotels(name)')
    .eq('member_id', member.id)
    .order('created_at', { ascending: false })
    .limit(10);

  // Calculate tier
  const program = member.loyalty_programs as any;
  const tiers: any[] = program?.tiers || [];
  const currentTier = [...tiers].reverse().find(t => member.total_points >= t.min_points) || tiers[0];
  const nextTier    = tiers.find(t => t.min_points > member.total_points);

  return NextResponse.json({
    member: {
      ...member,
      currentTier: currentTier?.name || 'Bronze',
      tierBenefits: currentTier?.benefits || [],
      pointsToNextTier: nextTier ? nextTier.min_points - member.total_points : 0,
      nextTierName: nextTier?.name || null,
    },
    transactions: txs || [],
    program: program,
  });
}

// Earn points after stay. Staff-only; automation should call a cron route with CRON_SECRET instead.
export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'loyalty.earn', 30, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, LoyaltyEarnSchema);
  if (parsed.error) return parsed.error;
  const { reservationId, organizationId } = parsed.data;

  const admin = createAdminClient();

  const { data: res } = await admin
    .from('reservations')
    .select('id, hotel_id, total_amount, guest_account_id, status')
    .eq('id', reservationId)
    .single();

  if (!res || res.status !== 'checked_out') {
    return NextResponse.json({ error: 'Reservation not found or not checked out' }, { status: 400 });
  }

  const ctx = await requireHotelAccess(res.hotel_id, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const { data: program } = await admin
    .from('loyalty_programs')
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (!program) return NextResponse.json({ error: 'No loyalty program configured' }, { status: 404 });

  const pointsEarned = Math.floor(Number(res.total_amount) * (program.points_per_thb || 1));

  // Upsert member
  const memberNumber = `M${Date.now().toString(36).toUpperCase()}`;
  const { data: member } = await admin
    .from('loyalty_members')
    .upsert({
      organization_id: organizationId,
      guest_account_id: res.guest_account_id,
      member_number: memberNumber,
    }, { onConflict: 'organization_id,guest_account_id', ignoreDuplicates: false })
    .select().single();

  if (!member) return NextResponse.json({ error: 'Failed to create member' }, { status: 500 });

  // Add points
  await admin.from('loyalty_members').update({
    total_points:    member.total_points + pointsEarned,
    lifetime_points: member.lifetime_points + pointsEarned,
    total_stays:     member.total_stays + 1,
    total_spent:     Number(member.total_spent) + Number(res.total_amount),
  }).eq('id', member.id);

  // Update tier
  const tiers: any[] = program.tiers || [];
  const newPoints = member.total_points + pointsEarned;
  const newTier   = [...tiers].reverse().find(t => newPoints >= t.min_points)?.name || 'Bronze';
  await admin.from('loyalty_members').update({ tier: newTier }).eq('id', member.id);

  // Transaction log
  await admin.from('loyalty_transactions').insert({
    member_id: member.id,
    hotel_id: res.hotel_id,
    reservation_id: res.id,
    type: 'earn',
    points: pointsEarned,
    description: `Earned for stay`,
    balance_after: newPoints,
  });

  return NextResponse.json({ success: true, pointsEarned, newBalance: newPoints, newTier });
}
