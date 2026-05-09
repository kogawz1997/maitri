import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: task } = await admin.from('housekeeping_tasks').select('*').eq('id', id).single();
  if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  const ctx = await requireHotelAccess(task.hotel_id, ['owner', 'admin', 'manager', 'front_desk', 'housekeeping', 'staff']);
  if (ctx.error) return ctx.error;
  const { data, error } = await admin.from('housekeeping_tasks')
    .update({ status: 'in_progress', started_at: new Date().toISOString(), assigned_to: task.assigned_to || ctx.user.id })
    .eq('id', id)
    .eq('hotel_id', task.hotel_id)
    .select()
    .single();
  if (error || !data) return NextResponse.json({ error: error?.message || 'Failed to start task' }, { status: 500 });
  return NextResponse.json({ task: data });
}
