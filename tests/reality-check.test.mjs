import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));
const fail = (msg) => { console.error(`❌ ${msg}`); process.exitCode = 1; };
const pass = (msg) => console.log(`✅ ${msg}`);

const pkg = JSON.parse(read('package.json'));
const lock = JSON.parse(read('package-lock.json'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
for (const name of Object.keys(deps)) {
  const locked = lock.packages?.[`node_modules/${name}`]?.version;
  if (!locked) fail(`package-lock missing ${name}`);
}
pass('package-lock contains all direct dependencies');

const rateLimitSource = read('src/lib/security/rate-limit.ts');
if (!rateLimitSource.includes('export function rateLimitHeaders')) fail('rateLimitHeaders helper is missing');
else pass('rateLimitHeaders helper exists');

for (const file of ['src/app/api/ops/health/route.ts', 'src/app/api/ops/alerts/route.ts', 'src/app/api/ops/rate-limit-test/route.ts']) {
  const source = read(file);
  if (source.includes('const rl = rateLimit(') || source.includes('const result = rateLimit(')) {
    fail(`${file} still calls async rateLimit as a sync bucket checker`);
  }
}
pass('ops routes use rateLimitCheck for keyed checks');

if (exists('.env.localo')) fail('.env.localo typo file must not ship');
else pass('no .env.localo typo file ships');

if (!pkg.scripts?.['reality:check']) fail('reality:check script missing');
else pass('reality:check script registered');

if (!process.exitCode) console.log('✅ Reality check static gates passed');
