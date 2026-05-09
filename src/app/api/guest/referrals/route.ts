import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const ReferralSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create'),
    ownerGuestId: z.string().uuid().optional().nullable(),
    rewardType: z.enum(['percent', 'fixed']).optional().default('percent'),
    rewardValue: z.coerce.number().positive().max(100_000).optional().default(10),
  }),
  z.object({
    action: z.literal('apply'),
    code: z.string().trim().min(3).max(32),
  }),
]);

function code() {
  return `MTR-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.referrals.read', 60, 60_000);
  if (limited) return limited;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('referral_codes')
    .select('id, code, owner_guest_id, reward_type, reward_value, active, created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ referrals: data || [] });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.referrals.write', 30, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, ReferralSchema);
  if (parsed.error) return parsed.error;
  const admin = createAdminClient();

  if (parsed.data.action === 'create') {
    const payload = {
      code: code(),
      owner_guest_id: parsed.data.ownerGuestId || null,
      reward_type: parsed.data.rewardType,
      reward_value: parsed.data.rewardValue,
      active: true,
    };
    const { data, error } = await admin.from('referral_codes').insert(payload).select('id, code').single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, referral: data });
  }

  const referralCode = parsed.data.code.trim().toUpperCase();
  const { data: referral, error } = await admin
    .from('referral_codes')
    .select('id, code, reward_type, reward_value, active')
    .eq('code', referralCode)
    .eq('active', true)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!referral) return NextResponse.json({ valid: false, error: 'Referral code invalid' }, { status: 404 });

  return NextResponse.json({ valid: true, referral });
}
