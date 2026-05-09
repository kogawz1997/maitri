import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const fail = (m) => { console.error(`❌ ${m}`); process.exitCode = 1; };
const pass = (m) => console.log(`✅ ${m}`);

const packageJson = JSON.parse(read('package.json'));
if (packageJson.scripts?.lint?.includes('next lint')) fail('lint still uses removed/deprecated next lint command');
else pass('lint uses standalone eslint command');

if (packageJson.engines?.node !== '20.x') fail('package.json must pin Node 20.x for Vercel consistency');
else pass('Node engine pinned to 20.x');

if (!exists('next-env.d.ts')) fail('next-env.d.ts missing');
else pass('next-env.d.ts present');

const prodEnv = read('.env.production.example');
const cronSecretCount = (prodEnv.match(/^CRON_SECRET=/gm) || []).length;
const appUrlCount = (prodEnv.match(/^NEXT_PUBLIC_APP_URL=/gm) || []).length;
if (cronSecretCount !== 1 || appUrlCount !== 1) fail('.env.production.example contains duplicate critical env keys');
else pass('production env example has no duplicate critical keys');

const tm30 = read('src/app/api/cron/tm30-reminder/route.ts');
if (!tm30.includes('sendOpsAlert') || tm30.includes('TODO: send reminder')) fail('TM30 reminder still lacks real ops alert wiring');
else pass('TM30 reminder sends ops alert and logs event');

const billingWebhook = read('src/app/api/billing/webhook/route.ts');
if (!billingWebhook.includes('sendOpsAlert') || billingWebhook.includes('TODO: Send email alert')) fail('Stripe payment failure still lacks alert wiring');
else pass('Stripe payment failure sends ops alert and logs event');

const vercel = JSON.parse(read('vercel.json'));
const cronPaths = new Set((vercel.crons || []).map((c) => c.path));
for (const required of ['/api/cron/trial-expire', '/api/ota/process', '/api/cron/no-show']) {
  if (!cronPaths.has(required)) fail(`missing Vercel cron: ${required}`);
}
if (!process.exitCode) pass('final hardening checks passed');
