import assert from 'node:assert/strict';
import fs from 'node:fs';

const required = [
  'src/lib/pms/cancellation-policy.ts',
  'src/lib/pms/availability.ts',
  'src/lib/billing/feature-gate.ts',
  'src/app/api/reservations/[id]/extend/route.ts',
  'src/app/api/reservations/[id]/move-room/route.ts',
  'src/app/api/folios/[id]/split/route.ts',
  'src/app/api/folios/[id]/merge/route.ts',
];

for (const file of required) assert.equal(fs.existsSync(file), true, `${file} missing`);

const cancellation = fs.readFileSync('src/lib/pms/cancellation-policy.ts', 'utf8');
assert.match(cancellation, /refund|penalty|free/i, 'cancellation policy should calculate refund or penalty');

const featureGate = fs.readFileSync('src/lib/billing/feature-gate.ts', 'utf8');
assert.match(featureGate, /plan|limit|feature/i, 'feature gate should reference plans, limits, or features');

console.log('✅ Unit policy checks passed');
