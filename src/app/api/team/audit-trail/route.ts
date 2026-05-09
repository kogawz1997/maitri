import { NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';

export async function GET() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin']);
  if (ctx.error) return ctx.error;

  const { data, error } = await ctx.supabase
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, user_id, changes, created_at')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: 'โหลด audit trail ไม่สำเร็จ' }, { status: 500 });
  return NextResponse.json({ events: data || [] });
}
