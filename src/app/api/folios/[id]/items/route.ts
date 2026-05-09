import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  type: z.enum(['room', 'tax', 'fb', 'spa', 'minibar', 'service', 'damage', 'discount', 'payment', 'refund']),
  description: z.string().min(1).max(255),
  amount: z.coerce.number(),
  quantity: z.coerce.number().int().positive().default(1),
  referenceId: z.string().uuid().optional().nullable(),
  referenceType: z.string().max(80).optional().nullable(),
});

async function loadFolio(admin: ReturnType<typeof createAdminClient>, id: string) {
  const { data } = await admin.from('folios').select('*, reservations(id, hotel_id)').eq('id', id).single();
  return data;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'folios.items.add', 40, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;

  const admin = createAdminClient();
  const folio = await loadFolio(admin, id);
  if (!folio) return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
  const ctx = await requireHotelAccess(folio.hotel_id, ['owner', 'admin', 'manager', 'front_desk']);
  if (ctx.error) return ctx.error;

  const body = parsed.data;
  const { data: item, error } = await admin.from('folio_items').insert({
    folio_id: id,
    type: body.type,
    description: body.description,
    amount: body.amount,
    quantity: body.quantity,
    posted_by: ctx.user.id,
    reference_id: body.referenceId || null,
    reference_type: body.referenceType || null,
  }).select().single();
  if (error || !item) return NextResponse.json({ error: error?.message || 'Failed to add folio item' }, { status: 500 });

  await admin.rpc('recalculate_folio_totals', { p_folio_id: id });
  await admin.from('audit_logs').insert({ hotel_id: folio.hotel_id, user_id: ctx.user.id, action: 'folio.item.added', entity_type: 'folio', entity_id: id, changes: body });
  return NextResponse.json({ item });
}
