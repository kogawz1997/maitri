import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/guards';

export async function GET(request: Request) {
  const ctx = await requirePlatformAdmin();
  if (ctx.error) return ctx.error;

  const { searchParams } = new URL(request.url);
  const severity = searchParams.get('severity') || undefined;
  const limit = Math.min(Number(searchParams.get('limit') || 100), 250);

  let query = ctx.supabase
    .from('operational_events')
    .select('id, hotel_id, event_type, severity, title, details, source, resolved_at, created_at, hotels(name, organization_id, organizations(name))')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (severity) query = query.eq('severity', severity);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ events: data || [] });
}
