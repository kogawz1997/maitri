import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const files = [
  'src/lib/pms/cancellation-policy.ts',
  'src/lib/pms/availability.ts',
  'src/app/api/reservations/[id]/extend/route.ts',
  'src/app/api/reservations/[id]/move-room/route.ts',
  'src/app/api/folios/[id]/items/route.ts',
  'supabase/migrations/20260506000000_phase11_pms_core_ops.sql',
];
for (const file of files) assert.ok(existsSync(file), `${file} should exist`);

const sql = readFileSync('supabase/migrations/20260506000000_phase11_pms_core_ops.sql', 'utf8');
assert.match(sql, /prevent_reservation_overbooking/);
assert.match(sql, /recalculate_folio_totals/);
assert.match(sql, /auto_create_checkout_housekeeping/);

const reservationsApi = readFileSync('src/app/api/reservations/route.ts', 'utf8');
assert.match(reservationsApi, /await rateLimit/);
assert.match(reservationsApi, /assertRoomAvailable/);

console.log('✅ Core PMS ops checks passed');
