import assert from 'node:assert/strict';
import fs from 'node:fs';

const routeMustExist = [
  'src/app/auth/signup/page.tsx',
  'src/app/onboarding/page.tsx',
  'src/app/api/bookings/quote/route.ts',
  'src/app/api/payments/charge/route.ts',
  'src/app/api/reservations/[id]/route.ts',
  'src/app/dashboard/housekeeping/mobile/page.tsx',
  'src/app/api/admin/orgs/[id]/impersonate/route.ts',
  'src/app/api/ota/process/route.ts',
  'src/app/api/ops/metrics/route.ts',
];

for (const file of routeMustExist) assert.equal(fs.existsSync(file), true, `${file} missing`);

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const cronPaths = new Set((vercel.crons || []).map((cron) => cron.path));
for (const path of ['/api/cron/no-show', '/api/cron/trial-expire', '/api/ota/process']) {
  assert.equal(cronPaths.has(path), true, `${path} cron missing`);
}

const sw = fs.readFileSync('public/sw.js', 'utf8');
assert.match(sw, /offline\.html/, 'service worker should serve offline fallback');

console.log('✅ E2E production flow static checks passed');
