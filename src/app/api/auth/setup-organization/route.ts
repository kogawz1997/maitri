import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { bootstrapOwnerAccount } from '@/lib/auth/onboarding';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  fullName: z.string().trim().min(2).max(120),
  hotelName: z.string().trim().min(2).max(160),
});

function toSlug(value: string) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ก-๙]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'hotel';
}

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'auth.setup-organization', 5, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const { fullName, hotelName } = parsed.data;

  const sessionSupabase = await createClient();
  const { data: { user }, error: authError } = await sessionSupabase.auth.getUser();
  if (authError || !user?.id || !user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await bootstrapOwnerAccount({
      userId: user.id,
      email: user.email,
      fullName,
      hotelName,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to setup organization' },
      { status: 500 }
    );
  }
}
