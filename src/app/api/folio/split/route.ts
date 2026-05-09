/**
 * Split Folio API
 * Split folio items between two guests (e.g. couple sharing room)
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

const SplitSchema = z.object({
  hotelId:       z.string().uuid(),
  reservationId: z.string().uuid(),
  splitType:     z.enum(['equal', 'by_item', 'by_percent']),
  // for by_item: array of item IDs to move to folio B
  itemIds:       z.array(z.string().uuid()).optional(),
  // for by_percent: 0-100, rest goes to folio B
  percentA:      z.number().min(1).max(99).optional(),
  guestBName:    z.string().min(1).max(100),
  guestBEmail:   z.string().email().optional(),
});

export async function POST(request: NextRequest) {
  const body = SplitSchema.parse(await request.json());

  const ctx = await requireHotelAccess(body.hotelId, ['owner', 'admin', 'manager', 'receptionist']);
  if (ctx.error) return ctx.error;

  const admin = createAdminClient();

  const { data: folio } = await admin
    .from('folios').select('*, folio_items(*)')
    .eq('reservation_id', body.reservationId).single();

  if (!folio) return NextResponse.json({ error: 'Folio not found' }, { status: 404 });

  const items: any[] = folio.folio_items || [];
  const totalAmount  = items.reduce((s: number, i: any) => s + Number(i.amount), 0);

  let folioAItems: any[] = [];
  let folioBItems: any[] = [];

  if (body.splitType === 'equal') {
    const half = Math.ceil(items.length / 2);
    folioAItems = items.slice(0, half);
    folioBItems = items.slice(half);
  } else if (body.splitType === 'by_item' && body.itemIds) {
    folioAItems = items.filter((i: any) => !body.itemIds!.includes(i.id));
    folioBItems = items.filter((i: any) => body.itemIds!.includes(i.id));
  } else if (body.splitType === 'by_percent' && body.percentA) {
    const amtA = (totalAmount * body.percentA) / 100;
    let cumA = 0;
    for (const item of items) {
      if (cumA < amtA) { folioAItems.push(item); cumA += Number(item.amount); }
      else folioBItems.push(item);
    }
  }

  const amtA = folioAItems.reduce((s: number, i: any) => s + Number(i.amount), 0);
  const amtB = folioBItems.reduce((s: number, i: any) => s + Number(i.amount), 0);

  // Create folio B
  const { data: folioB } = await admin.from('folios').insert({
    hotel_id:       body.hotelId,
    reservation_id: body.reservationId,
    status:         'open',
    total_charges:  amtB,
    balance:        amtB,
    notes:          `Split folio — ${body.guestBName}${body.guestBEmail ? ` (${body.guestBEmail})` : ''}`,
  }).select().single();

  // Move items to folio B
  if (folioB && folioBItems.length > 0) {
    await admin.from('folio_items')
      .update({ folio_id: folioB.id })
      .in('id', folioBItems.map((i: any) => i.id));
  }

  // Update folio A balance
  await admin.from('folios').update({ total_charges: amtA, balance: amtA }).eq('id', folio.id);

  return NextResponse.json({
    success: true,
    folioA: { id: folio.id, total: amtA, items: folioAItems.length },
    folioB: { id: folioB?.id, total: amtB, items: folioBItems.length, guestB: body.guestBName },
  });
}
