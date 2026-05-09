import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';

const schema = z.object({ targetFolioId: z.string().uuid(), note: z.string().max(500).optional().nullable() });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const admin = createAdminClient();
  const { data: source } = await admin.from('folios').select('*').eq('id', id).single();
  const { data: target } = await admin.from('folios').select('*').eq('id', parsed.data.targetFolioId).single();
  if (!source || !target || source.hotel_id !== target.hotel_id) return NextResponse.json({ error: 'Folios not found or hotel mismatch' }, { status: 404 });
  const ctx = await requireHotelAccess(source.hotel_id, ['owner', 'admin', 'manager', 'front_desk']);
  if (ctx.error) return ctx.error;

  const { error: moveError } = await admin.from('folio_items').update({ folio_id: target.id }).eq('folio_id', source.id);
  if (moveError) return NextResponse.json({ error: moveError.message }, { status: 500 });
  await admin.from('folios').update({ status: 'transferred', merged_into_folio_id: target.id, closed_at: new Date().toISOString() }).eq('id', source.id);
  await admin.rpc('recalculate_folio_totals', { p_folio_id: target.id });
  await admin.from('audit_logs').insert({ hotel_id: source.hotel_id, user_id: ctx.user.id, action: 'folio.merged', entity_type: 'folio', entity_id: source.id, changes: { targetFolioId: target.id, note: parsed.data.note } });
  return NextResponse.json({ success: true, targetFolioId: target.id });
}
