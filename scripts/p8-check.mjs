import 'dotenv/config';
const base = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const secret = process.env.CRON_SECRET;
const checks = [{ name: 'health', url: '/api/ops/health' }, { name: 'automation cron', url: '/api/automation/run', auth: true }, { name: 'ota worker', url: '/api/ota/process', auth: true }];
let failed = 0;
for (const check of checks) {
  try {
    const res = await fetch(`${base}${check.url}`, { headers: check.auth && secret ? { Authorization: `Bearer ${secret}` } : {} });
    console.log(`${res.ok ? '✅' : '❌'} ${check.name}: ${res.status}`);
    if (!res.ok) failed += 1;
  } catch (err) { failed += 1; console.log(`❌ ${check.name}:`, err.message); }
}
if (failed) process.exit(1);
console.log('✅ P8 runtime checks passed');
