import { createAdminClient } from '@/lib/supabase/server';

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'hotel';
}

function uniqueSlug(base: string) {
  return `${toSlug(base)}-${crypto.randomUUID().slice(0, 8)}`;
}

export type BootstrapOwnerInput = {
  userId: string;
  email: string;
  fullName?: string | null;
  hotelName?: string | null;
};

export async function bootstrapOwnerAccount(input: BootstrapOwnerInput) {
  const admin = createAdminClient();
  const fullName = input.fullName?.trim() || input.email.split('@')[0] || 'Hotel Owner';
  const hotelName = input.hotelName?.trim() || `${fullName}'s Hotel`;

  const { data: existingProfile, error: profileLookupError } = await admin
    .from('user_profiles')
    .select('id, organization_id, email, full_name, role, active, onboarding_completed')
    .eq('id', input.userId)
    .maybeSingle();

  if (profileLookupError) throw profileLookupError;

  if (existingProfile?.organization_id) {
    const { data: hotel, error: hotelError } = await admin
      .from('hotels')
      .select('id')
      .eq('organization_id', existingProfile.organization_id)
      .limit(1)
      .maybeSingle();

    if (hotelError) throw hotelError;

    return {
      organizationId: existingProfile.organization_id as string,
      hotelId: hotel?.id as string | undefined,
      alreadyConfigured: true,
    };
  }

  const orgSlug = uniqueSlug(hotelName);
  const { data: org, error: orgError } = await admin
    .from('organizations')
    .insert({
      name: hotelName,
      slug: orgSlug,
      billing_email: input.email,
    })
    .select('id')
    .single();

  if (orgError) throw orgError;

  const { data: hotel, error: hotelError } = await admin
    .from('hotels')
    .insert({
      organization_id: org.id,
      name: hotelName,
      slug: orgSlug,
      type: 'hotel',
      email: input.email,
      currency: 'THB',
      country: 'TH',
      timezone: 'Asia/Bangkok',
    })
    .select('id')
    .single();

  if (hotelError) throw hotelError;

  const { error: upsertError } = await admin.from('user_profiles').upsert({
    id: input.userId,
    organization_id: org.id,
    email: input.email,
    full_name: fullName,
    role: 'owner',
    active: true,
    onboarding_completed: false,
  }, { onConflict: 'id' });

  if (upsertError) throw upsertError;

  await admin.from('audit_logs').insert({
    hotel_id: hotel.id,
    user_id: input.userId,
    action: 'organization.created',
    entity_type: 'organization',
    entity_id: org.id,
    changes: { hotelName, fullName, source: 'phase1-bootstrap' },
  });

  return {
    organizationId: org.id as string,
    hotelId: hotel.id as string,
    alreadyConfigured: false,
  };
}
