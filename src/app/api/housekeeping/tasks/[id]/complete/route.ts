import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJson } from '@/lib/http/validation';
import { createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';

const schema = z.object({ notes: z.string().max(1000).optional().nullable(), photoUrls: z.array(z.string().url()).max(10).optional().default([]) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const parsed = await parseJson(request, schema);
  if (parsed.error) return parsed.error;
  const admin = createAdminClient();
  const { data: task } = await admin.from('housekeeping_tasks').select('*').eq('id', id).single();
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  const ctx = await requireHotelAccess(task.hotel_id, ['owner', 'admin', 'manager', 'front_desk', 'housekeeping', 'staff']);
  if (ctx.error) return ctx.error;
  const { data, error } = await admin.from('housekeeping_tasks')
    .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: ctx.user.id, notes: parsed.data.notes ?? task.notes, photo_urls: parsed.data.photoUrls, mobile_notes: { completedVia: 'mobile', completedAt: new Date().toISOString() } })
    .eq('id', id)
    .eq('hotel_id', task.hotel_id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to complete task' }, { status: 500 });
  if (task.room_id) await admin.from('rooms').update({ status: 'available' }).eq('id', task.room_id).eq('hotel_id', task.hotel_id);
  return NextResponse.json({ task: data });
}
