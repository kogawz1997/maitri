import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  allocations: z.array(z.object({
    amount: z.coerce.number().positive(),
    method: z.enum(['cash', 'card', 'transfer', 'promptpay', 'other']).default('other'),
    note: z.string().max(255).optional().nullable(),
  })).min(1).max(10),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'folios.payments.allocate', 25, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;

  const admin = createAdminClient();
  const { data: folio } = await admin.from('folios').select('id,hotel_id').eq('id', id).single();
  if (!folio) return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
  const ctx = await requireHotelAccess(folio.hotel_id, ['owner', 'admin', 'manager', 'front_desk']);
  if (ctx.error) return ctx.error;

  const rows = parsed.data.allocations.map((a) => ({
    folio_id: id,
    type: 'payment',
    description: `Payment allocation (${a.method})${a.note ? ` - ${a.note}` : ''}`,
    amount: a.amount,
    quantity: 1,
    posted_by: ctx.user.id,
    reference_type: 'payment.allocation',
    reference_id: null,
  }));

  const { data: items, error } = await admin.from('folio_items').insert(rows).select('id,amount,description,type');
  if (error) return NextResponse.json({ error: error.message || 'Failed to allocate payments' }, { status: 500 });

  await admin.rpc('recalculate_folio_totals', { p_folio_id: id });
  await admin.from('audit_logs').insert({
    hotel_id: folio.hotel_id,
    user_id: ctx.user.id,
    action: 'folio.payments.allocated',
    entity_type: 'folio',
    entity_id: id,
    changes: { allocations: parsed.data.allocations, count: parsed.data.allocations.length },
  });

  return NextResponse.json({ items, count: parsed.data.allocations.length });
}
