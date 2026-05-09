import fs from 'node:fs';

const configPath = 'ops/uptime-monitor.json';
const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);
const failures = [];

if (!Array.isArray(config.checks) || config.checks.length < 3) failures.push('expected at least 3 uptime checks');
for (const check of config.checks || []) {
  if (!check.path?.startsWith('/')) failures.push(`invalid path for ${check.name}`);
  if (!check.expectedStatus) failures.push(`missing expectedStatus for ${check.name}`);
  if (!check.timeoutMs || check.timeoutMs > 15000) failures.push(`invalid timeout for ${check.name}`);
}
if (!config.alerts?.failureThreshold) failures.push('missing alert failureThreshold');

if (failures.length) {
  console.error('❌ Uptime config failed');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('✅ Uptime config checks passed');
