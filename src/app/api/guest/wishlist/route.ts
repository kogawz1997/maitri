import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const WishlistSchema = z.object({
  hotelId: z.string().uuid(),
  roomTypeId: z.string().uuid().optional().nullable(),
});

export async function GET(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.wishlist.read', 60, 60_000);
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await supabase
    .from('guest_wishlists')
    .select('id, hotel_id, room_type_id, created_at, hotels(id,name,slug,city,hero_image_url,check_in_time,check_out_time), room_types(name,base_rate,size_sqm,max_occupancy,bed_type)')
    .eq('guest_account_id', user.id)
    .order('created_at', { ascending: false });

  return NextResponse.json({ wishlists: data || [] });
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.wishlist.write', 30, 60_000);
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const parsed = await parseJson(request, WishlistSchema);
  if (parsed.error) return parsed.error;

  const { hotelId, roomTypeId } = parsed.data;
  const { data, error } = await supabase.from('guest_wishlists').upsert({
    guest_account_id: user.id,
    hotel_id: hotelId,
    room_type_id: roomTypeId || null,
  }, { onConflict: 'guest_account_id,hotel_id,room_type_id' }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, wishlist: data });
}

export async function DELETE(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.wishlist.delete', 30, 60_000);
  if (limited) return limited;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const { error } = await supabase.from('guest_wishlists').delete()
    .eq('id', id).eq('guest_account_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
