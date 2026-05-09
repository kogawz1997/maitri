/**
 * Admin Impersonate API
 * Allows platform admin to view system as a specific tenant
 * Always creates an audit log — cannot be hidden
 */
import { NextRequest, NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const ImpersonateSchema = z.object({
  organizationId: z.string().uuid(),
  reason:         z.string().min(10, 'Reason must be at least 10 characters').max(200),
});

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (ctx.error) return ctx.error;

  const raw = await request.json();
  const body = ImpersonateSchema.parse(raw);

  const admin = createAdminClient();

  const { data: org } = await admin
    .from('organizations')
    .select('id, name, subscription_plan, subscription_status')
    .eq('id', body.organizationId).single();

  if (!org) return NextResponse.json({ error: 'Organization not found' }, { status: 404 });

  // Always log impersonation — immutable audit trail
  await admin.from('audit_logs').insert({
    action: 'admin.impersonate',
    entity_type: 'organization',
    entity_id: body.organizationId,
    changes: {
      admin_id:    ctx.user.id,
      admin_email: ctx.user.email,
      reason:      body.reason,
      org_name:    org.name,
      timestamp:   new Date().toISOString(),
    },
  });

  // Get owner of the org to impersonate
  const { data: owner } = await admin
    .from('user_profiles')
    .select('id')
    .eq('organization_id', body.organizationId)
    .eq('role', 'owner')
    .limit(1).single();

  if (!owner) return NextResponse.json({ error: 'No owner found for this organization' }, { status: 404 });

  // Generate short-lived impersonation token (store in Redis/KV)
  const token   = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 min

  // Store in audit for retrieval (simple approach without Redis)
  await admin.from('audit_logs').insert({
    action: 'admin.impersonate_token',
    entity_type: 'organization',
    entity_id: body.organizationId,
    changes: { token_hash: Buffer.from(token).toString('base64').slice(0, 8) + '...', expires: expires.toISOString() },
  });

  return NextResponse.json({
    success: true,
    message: 'Impersonation logged. Redirecting to org dashboard.',
    orgId: body.organizationId,
    orgName: org.name,
    ownerId: owner.id,
    // In production: generate Supabase admin token for owner user
    // const { data } = await supabaseAdmin.auth.admin.generateLink({ type: 'magiclink', email: ownerEmail })
    dashboardUrl: `/dashboard?impersonate=${body.organizationId}&admin=${ctx.user.id}`,
    expiresAt: expires.toISOString(),
    auditNote: 'This impersonation has been logged and cannot be undone.',
  });
}

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin();
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();
  const { data: logs } = await admin
    .from('audit_logs')
    .select('id, entity_id, changes, created_at')
    .eq('action', 'admin.impersonate')
    .order('created_at', { ascending: false })
    .limit(50);

  return NextResponse.json({ logs: logs || [] });
}
