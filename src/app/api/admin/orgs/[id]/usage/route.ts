import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/guards';
import { getOrganizationUsage } from '@/lib/saas/usage';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePlatformAdmin();
  if (ctx.error) return ctx.error;
  const { id } = await params;
  return NextResponse.json(await getOrganizationUsage(id));
}
