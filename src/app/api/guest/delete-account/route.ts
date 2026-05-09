/**
 * PDPA Compliance — Guest Account Deletion
 * Right to erasure under PDPA (Thailand) and GDPR
 * Anonymizes/unlinks personal data, retains financial records (legal requirement)
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const DeleteAccountSchema = z.object({
  reason: z.string().trim().max(500).optional().default('User request'),
}).partial().default({});

export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.delete-account', 5, 60_000);
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let rawBody: unknown = {};
  try { rawBody = await request.json(); } catch { rawBody = {}; }
  const parsed = DeleteAccountSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }
  const reason = parsed.data.reason || 'User request';
  const admin = createAdminClient();
  const deletedAt = new Date().toISOString();

  // 1. Detach reservations from the guest account while keeping financial records intact.
  await admin.from('reservations').update({
    guest_account_id: null,
  }).eq('guest_account_id', user.id);

  // 2. Anonymize guest_accounts before deleting the auth user. If the FK cascade removes
  // the row, audit_logs below still retain the proof of erasure.
  await admin.from('guest_accounts').update({
    first_name: '[Deleted]',
    last_name: '[Deleted]',
    email: `deleted_${Date.now()}@deleted.invalid`,
    phone: null,
    passport_number: null,
    date_of_birth: null,
    nationality: null,
    avatar_url: null,
    marketing_consent: false,
    deleted_at: deletedAt,
    updated_at: deletedAt,
  }).eq('id', user.id);

  // 3. Delete/revoke non-financial guest data.
  await Promise.all([
    admin.from('guest_wishlists').delete().eq('guest_account_id', user.id),
    admin.from('mobile_keys').update({ revoked: true }).eq('guest_account_id', user.id),
    admin.from('loyalty_members').update({ guest_account_id: null }).eq('guest_account_id', user.id),
  ]);

  // 4. Log deletion for PDPA audit trail.
  await admin.from('audit_logs').insert({
    action: 'pdpa.account_deleted',
    entity_type: 'guest_account',
    entity_id: user.id,
    changes: {
      reason,
      deleted_at: deletedAt,
      data_retained: 'Financial records retained per Thai accounting law (5 years)',
    },
  });

  // 5. Delete auth user after unlink/anonymization work.
  await admin.auth.admin.deleteUser(user.id);

  return NextResponse.json({
    success: true,
    message: 'บัญชีถูกลบแล้ว ข้อมูลการเงินถูกเก็บตามกฎหมาย',
  });
}
