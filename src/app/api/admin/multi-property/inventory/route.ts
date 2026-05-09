import { NextResponse } from 'next/server';
import { requirePlatformAdmin } from '@/lib/auth/guards';

export async function GET() {
  const auth = await requirePlatformAdmin();
  if (auth.error) return auth.error;

  const [{ data: inventoryRows, error: invError }, { data: chainRows, error: chainError }] = await Promise.all([
    auth.supabase
      .from('org_central_inventory')
      .select('organization_id, hotel_id, hotel_name, total_rooms, available_rooms, occupied_rooms, maintenance_rooms, blocked_rooms')
      .order('hotel_name', { ascending: true })
      .limit(500),
    auth.supabase
      .from('org_chain_directory')
      .select('organization_id, organization_name, hotels_count, active_hotels_count')
      .order('organization_name', { ascending: true })
      .limit(200),
  ]);

  if (invError || chainError) {
    return NextResponse.json({ error: invError?.message || chainError?.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    organizations: chainRows || [],
    inventory: inventoryRows || [],
  });
}
