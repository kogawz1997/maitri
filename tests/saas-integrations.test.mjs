import fs from 'node:fs';
import assert from 'node:assert/strict';

const required = [
  'src/app/api/cron/trial-expire/route.ts',
  'src/app/api/admin/orgs/[id]/impersonate/route.ts',
  'src/app/api/admin/orgs/[id]/usage/route.ts',
  'src/app/api/admin/errors/route.ts',
  'src/app/admin/errors/page.tsx',
  'src/lib/saas/usage.ts',
  'src/app/api/channels/line/connect/route.ts',
  'src/app/api/compliance/tm30/export/route.ts',
  'src/lib/ota/conflicts.ts',
  'supabase/migrations/20260506010000_phase12_saas_control_integrations.sql',
];

for (const file of required) assert.ok(fs.existsSync(file), `${file} missing`);

const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
assert.ok(vercel.crons.some(c => c.path === '/api/cron/trial-expire'), 'trial-expire cron missing');
assert.ok(vercel.crons.some(c => c.path === '/api/ota/process'), 'ota process cron missing');

const ota = fs.readFileSync('src/app/api/ota/process/route.ts', 'utf8');
assert.match(ota, /duplicate_ignored/, 'OTA duplicate handling missing');
assert.match(ota, /retry/, 'OTA retry handling missing');

const webhook = fs.readFileSync('src/lib/security/webhook.ts', 'utf8');
assert.match(webhook, /verifyHmacSha256/, 'HMAC helper missing');
assert.match(webhook, /assertWebhookFresh/, 'freshness helper missing');

console.log('✅ SaaS integrations checks passed');
