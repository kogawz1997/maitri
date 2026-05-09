import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  marketingConsent: z.boolean().optional(),
  preferredLanguage: z.string().min(2).max(10).optional(),
  quietHoursStart: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  quietHoursEnd: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: account } = await supabase
    .from('guest_accounts')
    .select('id,email,phone,preferred_language,marketing_consent')
    .eq('id', user.id)
    .single();
  if (!account) return NextResponse.json({ error: 'Account not found' }, { status: 404 });

  return NextResponse.json({
    channels: { email: !!account.email, sms: !!account.phone, push: true },
    preferences: {
      marketingConsent: !!account.marketing_consent,
      preferredLanguage: account.preferred_language || 'th',
      quietHoursStart: null,
      quietHoursEnd: null,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const payload = await request.json().catch(() => null);
  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = parsed.data;
  const updates: Record<string, any> = {};
  if (typeof body.marketingConsent === 'boolean') updates.marketing_consent = body.marketingConsent;
  if (body.preferredLanguage) updates.preferred_language = body.preferredLanguage;
  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'No updates provided' }, { status: 400 });

  const { error } = await supabase.from('guest_accounts').update(updates).eq('id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from('audit_logs').insert({
    user_id: user.id,
    action: 'guest.notifications.preferences.updated',
    entity_type: 'guest_account',
    entity_id: user.id,
    changes: {
      marketing_consent: updates.marketing_consent ?? undefined,
      preferred_language: updates.preferred_language ?? undefined,
      quiet_hours_start: body.quietHoursStart ?? null,
      quiet_hours_end: body.quietHoursEnd ?? null,
    },
  });
  return NextResponse.json({ success: true });
}
