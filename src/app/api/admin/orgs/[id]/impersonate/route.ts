import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requirePlatformAdmin } from '@/lib/auth/guards';

const bodySchema = z.object({
  reason: z.string().min(3).max(200).optional().default('support'),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin();
  if (ctx.error) return ctx.error;
  const { id: organizationId } = await params;
  const raw = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  const { data: org } = await ctx.supabase.from('organizations').select('id, name').eq('id', organizationId).single();
  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();
  const { data: session, error } = await ctx.supabase
    .from('admin_impersonation_sessions')
    .insert({
      organization_id: organizationId,
      admin_user_id: ctx.user.id,
      reason: body.reason || 'support',
      expires_at: expiresAt,
      status: 'active',
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await ctx.supabase.from('audit_logs').insert({
    user_id: ctx.user.id,
    action: 'admin.impersonation.started',
    entity_type: 'organization',
    entity_id: organizationId,
    changes: { reason: body.reason || 'support', expires_at: expiresAt },
  });

  return NextResponse.json({
    session,
    redirectTo: `/dashboard?impersonation=${session.id}`,
    warning: 'Read-only support mode. All actions must be audited.',
  });
}
