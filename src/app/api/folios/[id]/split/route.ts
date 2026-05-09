import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/security/rate-limit';

const schema = z.object({
  mode: z.enum(['by_item', 'by_percent', 'equal']).default('by_item'),
  itemIds: z.array(z.string().uuid()).optional(),
  percentToNewFolio: z.coerce.number().min(1).max(99).optional(),
  guestName: z.string().max(120).optional().nullable(),
  guestEmail: z.string().email().max(255).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = await rateLimit(request, 'folios.split', 20, 60_000);
  if (limited) return limited;
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const admin = createAdminClient();
  const { data: folio } = await admin.from('folios').select('*').eq('id', id).single();
  if (!folio) return NextResponse.json({ error: 'Folio not found' }, { status: 404 });
  const ctx = await requireHotelAccess(folio.hotel_id, ['owner', 'admin', 'manager', 'front_desk']);
  if (ctx.error) return ctx.error;

  const { data: newFolio, error: createError } = await admin.from('folios').insert({
    hotel_id: folio.hotel_id,
    reservation_id: folio.reservation_id,
    status: 'open',
    split_from_folio_id: id,
    notes: parsed.data.guestName ? `Split folio for ${parsed.data.guestName}${parsed.data.guestEmail ? ` (${parsed.data.guestEmail})` : ''}` : null,
  }).select().single();
  if (createError || !newFolio) return NextResponse.json({ error: createError?.message || 'Failed to create split folio' }, { status: 500 });

  const { data: items } = await admin.from('folio_items').select('id,amount').eq('folio_id', id).order('created_at', { ascending: true });
  const allItems = items || [];
  if (allItems.length === 0) return NextResponse.json({ error: 'No folio items to split' }, { status: 400 });

  let itemIdsToMove: string[] = [];
  if (parsed.data.mode === 'by_item') {
    itemIdsToMove = parsed.data.itemIds || [];
    if (itemIdsToMove.length === 0) return NextResponse.json({ error: 'itemIds required for by_item mode' }, { status: 400 });
  } else if (parsed.data.mode === 'equal') {
    itemIdsToMove = allItems.filter((_, idx) => idx % 2 === 1).map(i => i.id);
  } else {
    const percent = parsed.data.percentToNewFolio;
    if (!percent) return NextResponse.json({ error: 'percentToNewFolio required for by_percent mode' }, { status: 400 });
    const total = allItems.reduce((sum, i) => sum + Number(i.amount || 0), 0);
    const target = total * (percent / 100);
    let running = 0;
    itemIdsToMove = allItems.filter((i) => {
      if (running >= target) return false;
      running += Number(i.amount || 0);
      return true;
    }).map((i) => i.id);
  }

  const { error: moveError } = await admin.from('folio_items').update({ folio_id: newFolio.id }).in('id', itemIdsToMove).eq('folio_id', id);
  if (moveError) return NextResponse.json({ error: moveError.message }, { status: 500 });

  await Promise.all([
    admin.rpc('recalculate_folio_totals', { p_folio_id: id }),
    admin.rpc('recalculate_folio_totals', { p_folio_id: newFolio.id }),
  ]);
  await admin.from('audit_logs').insert({ hotel_id: folio.hotel_id, user_id: ctx.user.id, action: 'folio.split', entity_type: 'folio', entity_id: id, changes: { newFolioId: newFolio.id, mode: parsed.data.mode, movedItemIds: itemIdsToMove, note: parsed.data.note, guestName: parsed.data.guestName || null } });
  return NextResponse.json({ folio: newFolio, movedItems: itemIdsToMove.length, mode: parsed.data.mode });
}
