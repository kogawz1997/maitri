import assert from 'node:assert/strict';
import fs from 'node:fs';

const file = 'src/lib/booking/availability-lock.ts';
assert.equal(fs.existsSync(file), true, `${file} missing`);
const code = fs.readFileSync(file, 'utf8');

// Overbooking guard primitives must exist
assert.match(code, /pg_try_advisory_lock/, 'must use advisory lock to prevent concurrent overbooking');
assert.match(code, /pending_payment/, 'must treat pending_payment as inventory-holding status');
assert.match(code, /\.lt\('check_in', checkOut\)/, 'must apply overlap lower-bound check');
assert.match(code, /\.gt\('check_out', checkIn\)/, 'must apply overlap upper-bound check');
assert.match(code, /pg_advisory_unlock/, 'must release advisory lock in finally block');

console.log('✅ availability lock guard checks passed');
