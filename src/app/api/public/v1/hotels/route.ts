import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

function isAuthorized(request: NextRequest) {
  const expected = process.env.PUBLIC_API_KEY;
  if (!expected) return false;
  return request.headers.get('x-api-key') === expected;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { searchParams } = new URL(request.url);
  const city = (searchParams.get('city') || '').trim();
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 20)));

  let query = admin.from('hotels').select('id,name,slug,city,address,hero_image_url,active').eq('active', true).limit(limit);
  if (city) query = query.ilike('city', `%${city}%`);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ items: data || [], count: (data || []).length });
}
