import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { validateStaffLoginToken } from '@/lib/security/staff-link';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({ token: z.string().min(10) });

export async function POST(request: Request) {
  const limited = await rateLimit(request, 'team.staff-login-validate', 10, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;

  const result = validateStaffLoginToken(parsed.data.token);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ success: true, hotelId: result.hotelId, exp: result.exp });
}
