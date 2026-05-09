import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';
import { HOTEL_ROLES } from '@/lib/hotel-roles';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  role: z.enum(HOTEL_ROLES),
});

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'team.create-account', 10, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const { email, password, fullName, role } = parsed.data;

  const ctx = await requireHotelAccess(null, ['owner', 'admin']);
  if (ctx.error) return ctx.error;
  if (!ctx.profile) return NextResponse.json({ error: 'Profile not found' }, { status: 403 });


  if (ctx.profile.role !== 'owner' && role === 'admin') {
    return NextResponse.json({ error: 'เฉพาะเจ้าของโรงแรมเท่านั้นที่สร้างบัญชีแอดมินได้' }, { status: 403 });
  }

  const admin = createAdminClient();

  const { data: existingInOrg } = await admin
    .from('user_profiles')
    .select('id')
    .eq('organization_id', ctx.profile.organization_id)
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingInOrg) return NextResponse.json({ error: 'อีเมลนี้มีในทีมแล้ว' }, { status: 409 });

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: email.toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, owner_created: true },
  });

  if (createError || !created.user) {
    return NextResponse.json({ error: createError?.message || 'ไม่สามารถสร้างบัญชีได้' }, { status: 500 });
  }

  const initialActive = ctx.profile.role === 'owner';
  const { error: profileError } = await admin.from('user_profiles').insert({
    id: created.user.id,
    organization_id: ctx.profile.organization_id,
    email: email.toLowerCase(),
    full_name: fullName,
    role,
    active: initialActive,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return NextResponse.json({ error: 'ไม่สามารถบันทึกโปรไฟล์พนักงานได้' }, { status: 500 });
  }


  await admin.from('audit_logs').insert({
    hotel_id: ctx.hotelId,
    user_id: ctx.user!.id,
    action: 'team.member_created_by_owner',
    entity_type: 'user_profile',
    entity_id: created.user.id,
    changes: {
      actor_email: (ctx.user as any)?.email,
      actor_role: ctx.profile.role,
      target_email: email.toLowerCase(),
      target_role: role,
      created_at: new Date().toISOString(),
      needs_owner_approval: !initialActive,
    },
  });

  return NextResponse.json({ success: true, userId: created.user.id });
}
