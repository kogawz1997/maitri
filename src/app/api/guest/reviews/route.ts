import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { parseJson } from '@/lib/http/validation';
import { rateLimit } from '@/lib/security/rate-limit';

const GuestReviewSchema = z.object({
  hotelId: z.string().uuid(),
  reservationId: z.string().uuid().optional().nullable(),
  rating: z.coerce.number().int().min(1).max(5),
  ratingClean: z.coerce.number().int().min(1).max(5).optional().nullable(),
  ratingService: z.coerce.number().int().min(1).max(5).optional().nullable(),
  ratingLocation: z.coerce.number().int().min(1).max(5).optional().nullable(),
  ratingValue: z.coerce.number().int().min(1).max(5).optional().nullable(),
  title: z.string().trim().max(120).optional().nullable(),
  comment: z.string().trim().max(2000).optional().nullable(),
  reviewerName: z.string().trim().max(120).optional().nullable(),
});

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, 'guest.reviews.create', 20, 60_000);
  if (limited) return limited;

  const parsed = await parseJson(request, GuestReviewSchema);
  if (parsed.error) return parsed.error;
  const { hotelId, reservationId, rating, ratingClean, ratingService, ratingLocation, ratingValue, title, comment, reviewerName } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check if already reviewed
  if (reservationId) {
    const { data: existing } = await supabase
      .from('booking_reviews').select('id').eq('reservation_id', reservationId).single();
    if (existing) return NextResponse.json({ error: 'คุณรีวิวการจองนี้แล้ว' }, { status: 400 });
  }

  const { data, error } = await supabase.from('booking_reviews').insert({
    hotel_id: hotelId,
    reservation_id: reservationId || null,
    guest_account_id: user?.id || null,
    reviewer_name: reviewerName || 'แขกผู้เข้าพัก',
    rating,
    rating_clean: ratingClean || null,
    rating_service: ratingService || null,
    rating_location: ratingLocation || null,
    rating_value: ratingValue || null,
    title: title || null,
    comment: comment || null,
    verified_stay: !!reservationId,
    platform: 'direct',
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, review: data });
}
