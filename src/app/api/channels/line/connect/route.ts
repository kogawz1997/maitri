import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireHotelAccess } from '@/lib/auth/guards';

const Schema = z.object({
  channelId: z.string().min(3),
  channelSecret: z.string().min(8),
  channelAccessToken: z.string().min(8),
  displayName: z.string().optional(),
});

export async function POST(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;

  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/api/webhooks/line`;
  const credentials = {
    channel_id: parsed.data.channelId,
    channel_secret: parsed.data.channelSecret,
    channel_access_token: parsed.data.channelAccessToken,
  };

  const { data, error } = await ctx.supabase
    .from('channel_connections')
    .upsert({
      hotel_id: ctx.hotelId,
      channel: 'line',
      status: 'active',
      external_property_id: parsed.data.channelId,
      credentials,
      config: { display_name: parsed.data.displayName || 'LINE Official Account', webhook_url: webhookUrl },
      last_sync_at: new Date().toISOString(),
      last_error: null,
    }, { onConflict: 'hotel_id,channel' })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await ctx.supabase.from('audit_logs').insert({
    hotel_id: ctx.hotelId,
    user_id: ctx.user.id,
    action: 'channel.line.connected',
    entity_type: 'channel_connection',
    entity_id: data.id,
    changes: { webhook_url: webhookUrl, channel_id: parsed.data.channelId },
  });

  return NextResponse.json({ connection: data, webhookUrl, nextSteps: ['Paste webhook URL into LINE Developers', 'Enable Use webhook', 'Send a test message'] });
}

export async function GET(request: Request) {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return ctx.error;
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || new URL(request.url).origin}/api/webhooks/line`;
  const { data } = await ctx.supabase.from('channel_connections').select('*').eq('hotel_id', ctx.hotelId).eq('channel', 'line').maybeSingle();
  return NextResponse.json({ connection: data, webhookUrl });
}
