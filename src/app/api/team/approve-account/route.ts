import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';

const schema = z.object({ userId: z.string().uuid() });

export async function POST(request: Request) {
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const ctx = await requireHotelAccess(null, ['owner']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  const { error } = await admin.from('user_profiles').update({ active: true }).eq('id', parsed.data.userId).eq('organization_id', ctx.profile!.organization_id);
  if (error) return NextResponse.json({ error: 'Approve failed' }, { status: 500 });

  await admin.from('audit_logs').insert({
    hotel_id: ctx.hotelId,
    user_id: ctx.user!.id,
    action: 'team.member_approved',
    entity_type: 'user_profile',
    entity_id: parsed.data.userId,
    changes: { approved_at: new Date().toISOString(), approver: (ctx.user as any)?.email },
  });

  return NextResponse.json({ success: true });
}
