import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  description: z.string().min(1).max(255).default('Tax adjustment'),
  amount: z.coerce.number(),
  reason: z.string().max(255).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'folios.tax.adjustment', 25, 60_000);
  if (limited) return limited;

  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;

  const admin = createAdminClient();
  const { data: folio } = await admin.from('folios').select('id,hotel_id').eq('id', id).single();
  if (!folio) return NextResponse.json({ error: 'Folio not found' }, { status: 404 });

  const ctx = await requireHotelAccess(folio.hotel_id, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const body = parsed.data;
  const { data: item, error } = await admin.from('folio_items').insert({
    folio_id: id,
    type: 'tax',
    description: body.description,
    amount: body.amount,
    quantity: 1,
    posted_by: ctx.user.id,
    reference_type: 'tax.adjustment',
    reference_id: null,
  }).select().single();
  if (error || !item) return NextResponse.json({ error: error?.message || 'Failed to post tax adjustment' }, { status: 500 });

  await admin.rpc('recalculate_folio_totals', { p_folio_id: id });
  await admin.from('audit_logs').insert({
    hotel_id: folio.hotel_id,
    user_id: ctx.user.id,
    action: 'folio.tax.adjusted',
    entity_type: 'folio',
    entity_id: id,
    changes: { amount: body.amount, reason: body.reason || null, description: body.description },
  });

  return NextResponse.json({ item });
}
