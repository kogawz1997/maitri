import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: account, error: accountError } = await supabase
    .from('guest_accounts')
    .select('id,email,first_name,last_name,phone,nationality,date_of_birth,preferred_language,marketing_consent,created_at,updated_at')
    .eq('id', user.id)
    .single();

  if (accountError || !account) {
    return NextResponse.json({ error: 'Guest account not found' }, { status: 404 });
  }

  const [{ data: reservations }, { data: wishlist }, { data: reviews }] = await Promise.all([
    supabase
      .from('reservations')
      .select('id,reservation_code,hotel_id,guest_account_id,status,check_in,check_out,nights,total_amount,paid_amount,source,special_requests,created_at')
      .eq('guest_account_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('guest_wishlists')
      .select('id,hotel_id,room_type_id,created_at')
      .eq('guest_account_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('booking_reviews')
      .select('id,hotel_id,reservation_id,rating,rating_clean,rating_service,rating_location,rating_value,title,comment,platform,verified_stay,created_at')
      .eq('guest_account_id', user.id)
      .order('created_at', { ascending: false }),
  ]);

  const admin = createAdminClient();
  await admin.from('privacy_requests').insert({
    guest_account_id: user.id,
    email: user.email || account.email,
    request_type: 'export',
    status: 'completed',
    fulfilled_at: new Date().toISOString(),
    metadata: { source: 'guest_portal' },
  });

  const exportPayload = {
    exportedAt: new Date().toISOString(),
    format: 'maitri-pdpa-export-v1',
    subject: {
      authUserId: user.id,
      email: user.email,
    },
    account,
    reservations: reservations || [],
    wishlist: wishlist || [],
    reviews: reviews || [],
  };

  return new Response(JSON.stringify(exportPayload, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="maitri-pdpa-export-${user.id}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
