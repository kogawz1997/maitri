import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const PartnerIntegrationSchema = z.object({
  hotelId: z.string().uuid(),
  provider: z.string().trim().min(2).max(80),
  status: z.enum(['pending', 'active', 'paused', 'failed']).optional().default('pending'),
  config: z.record(z.any()).optional().default({}),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'partners.integrations.read', 60, 60_000);
  if (limited) return limited;

  const { searchParams } = new URL(request.url);
  const hotelId = searchParams.get('hotelId') || '';
  if (!hotelId) return NextResponse.json({ error: 'hotelId required' }, { status: 400 });

  const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from('partner_integrations')
    .select('id,hotel_id,provider,status,config,last_sync_at,created_at')
    .eq('hotel_id', hotelId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data || [] });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'partners.integrations.write', 20, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, PartnerIntegrationSchema);
  if (parsed.error) return parsed.error;
  const body = parsed.data;

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin']);
  if (ctx.error) return ctx.error;

  const payload = {
    hotel_id: body.hotelId,
    provider: body.provider,
    status: body.status,
    config: body.config,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await ctx.supabase
    .from('partner_integrations')
    .insert(payload)
    .select('id,hotel_id,provider,status,config,created_at')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, item: data });
}
