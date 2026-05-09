import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendOpsAlert } from '@/lib/ops/alerts';

// Vercel Cron — runs every day at 09:00 ICT (02:00 UTC)
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Find foreign guest check-ins from yesterday without TM30 submitted
  const { data: pending, error } = await admin
    .from('reservations')
    .select('id, reservation_code, hotel_id, guests(first_name, last_name, nationality)')
    .eq('check_in', yesterday)
    .neq('guests.nationality', 'Thai')
    .is('tm30_submitted_at', null);

  if (error) {
    console.error('[Cron TM30]', error.message);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }

  const count = pending?.length || 0;
  if (count > 0) {
    await sendOpsAlert({
      level: 'warning',
      title: 'TM30 reports pending',
      message: `${count} foreign guest check-ins still need TM30 submission for ${yesterday}.`,
      context: { date: yesterday, reservation_ids: pending?.map((r: any) => r.id).slice(0, 25) },
    });

    await admin.from('operational_events').insert({
      event_type: 'compliance.tm30.pending_reminder',
      severity: 'warning',
      title: 'TM30 reports pending',
      details: { count, date: yesterday },
      source: 'cron',
    });
  }
  console.log(`[Cron TM30] ${count} pending TM30 reports for ${yesterday}`);

  return NextResponse.json({
    processed: count,
    date: yesterday,
    message: 'TM30 reminder sent',
  });
}
