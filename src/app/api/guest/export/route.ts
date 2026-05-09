/**
 * PDPA Right to Data Portability
 * Guest can download all their personal data as JSON
 */
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  const [
    { data: account },
    { data: reservations },
    { data: reviews },
    { data: wishlists },
  ] = await Promise.all([
    admin.from('guest_accounts').select('*').eq('id', user.id).single(),
    admin.from('reservations').select(`
      reservation_code, status, check_in, check_out, nights,
      total_amount, paid_amount, source, special_requests,
      created_at, hotels(name, city), room_types(name)
    `).eq('guest_account_id', user.id).order('created_at', { ascending: false }),
    admin.from('booking_reviews').select('rating, title, comment, created_at, hotels(name)').eq('guest_account_id', user.id),
    admin.from('guest_wishlists').select('created_at, hotels(name, city)').eq('guest_account_id', user.id),
  ]);

  const exportData = {
    exported_at: new Date().toISOString(),
    gdpr_notice: 'ข้อมูลนี้ส่งออกตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล พ.ศ. 2562 (PDPA)',
    account: {
      id: account?.id,
      email: account?.email,
      first_name: account?.first_name,
      last_name: account?.last_name,
      phone: account?.phone,
      nationality: account?.nationality,
      preferred_language: account?.preferred_language,
      marketing_consent: account?.marketing_consent,
      created_at: account?.created_at,
    },
    reservations: (reservations || []).map(r => ({
      code: r.reservation_code,
      status: r.status,
      hotel: (r.hotels as any)?.name,
      room: (r.room_types as any)?.name,
      check_in: r.check_in,
      check_out: r.check_out,
      nights: r.nights,
      amount: r.total_amount,
      source: r.source,
      created_at: r.created_at,
    })),
    reviews: (reviews || []).map(r => ({
      hotel: (r.hotels as any)?.name,
      rating: r.rating,
      title: r.title,
      comment: r.comment,
      created_at: r.created_at,
    })),
    wishlists: (wishlists || []).map(w => ({
      hotel: (w.hotels as any)?.name,
      city: (w.hotels as any)?.city,
      saved_at: w.created_at,
    })),
  };

  const filename = `maitri-my-data-${format(new Date(), 'yyyy-MM-dd')}.json`;

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}

// PDPA Right to Erasure (Delete Account)
export async function DELETE() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const admin = createAdminClient();

  // Anonymise instead of hard delete (preserve reservation financial records)
  await admin.from('guest_accounts').update({
    email: `deleted_${user.id}@deleted.invalid`,
    first_name: 'Deleted',
    last_name: 'User',
    phone: null,
    nationality: null,
    passport_number: null,
    date_of_birth: null,
    marketing_consent: false,
  }).eq('id', user.id);

  // Sign out
  await supabase.auth.signOut();

  // Delete auth user (admin)
  await admin.auth.admin.deleteUser(user.id);

  return NextResponse.json({ success: true, message: 'บัญชีถูกลบและข้อมูลถูก anonymise แล้ว' });
}
