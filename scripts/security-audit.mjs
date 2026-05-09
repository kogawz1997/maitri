/**
 * Security Audit Script
 * Run: node scripts/security-audit.mjs
 * Checks for common security issues before deploy
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const issues = [];
const warnings = [];

const intentionallyPublicRoutes = [
  'src/app/api/billing/webhook/route.ts',
  'src/app/api/bookings/quote/route.ts',
  'src/app/api/guest/auth/forgot-password/route.ts',
  'src/app/api/guest/auth/login/route.ts',
  'src/app/api/guest/auth/register/route.ts',
  'src/app/api/guest/referrals/route.ts',
  'src/app/api/ops/rate-limit-test/route.ts',
  'src/app/api/partners/integrations/route.ts',
  'src/app/api/plugins/marketplace/route.ts',
  'src/app/api/team/accept-invite/route.ts',
  'src/app/api/team/staff-login-validate/route.ts',
];

function warn(file, msg) { warnings.push(`⚠️  ${file}: ${msg}`); }
function fail(file, msg) { issues.push(`❌ ${file}: ${msg}`); }

function scanFile(filePath) {
  let content;
  try { content = readFileSync(filePath, 'utf-8'); } catch { return; }
  const rel = filePath.replace(process.cwd() + '/', '');

  // Critical: hardcoded secrets
  const secretPatterns = [
    [/sk_live_[a-zA-Z0-9]{20,}/g,     'Hardcoded Stripe live key'],
    [/skey_live_[a-zA-Z0-9]{20,}/g,   'Hardcoded Omise live key'],
    [/SG\.[a-zA-Z0-9_-]{22,}\.[a-zA-Z0-9_-]{43}/g, 'Hardcoded SendGrid key'],
    [/sk-ant-api[a-zA-Z0-9_-]{90,}/g, 'Hardcoded Anthropic key'],
    [/password\s*=\s*['"][^'"]{8,}/gi, 'Possible hardcoded password'],
  ];
  for (const [pattern, msg] of secretPatterns) {
    if (pattern.test(content) && !rel.includes('.demo') && !rel.includes('smoke-test') && !rel.includes('security-audit')) {
      fail(rel, msg);
    }
  }

  // Warning: createAdminClient in client components
  if (content.includes("'use client'") && content.includes('createAdminClient')) {
    fail(rel, 'createAdminClient used in client component — service role exposed!');
  }

  // Warning: SUPABASE_SERVICE_ROLE_KEY in client-side code
  if (content.includes("'use client'") && content.includes('SUPABASE_SERVICE_ROLE_KEY')) {
    fail(rel, 'SUPABASE_SERVICE_ROLE_KEY referenced in client component');
  }

  // Warning: missing auth in API routes
  if (rel.startsWith('src/app/api/') && !rel.includes('/public/') && !rel.includes('/webhooks/') && !rel.includes('/health') && !rel.includes('/cron/')) {
    const hasAuth = [
      'getUser',
      'requireHotelAccess',
      'requirePlatformAdmin',
      'requireUser',
      'assertReservationAccess',
      'requireCronSecret',
      'CRON_SECRET',
      'runOtaProviderWorker',
    ].some(token => content.includes(token));
    if (!hasAuth && !intentionallyPublicRoutes.includes(rel)) {
      warn(rel, 'No auth check detected — verify this route is intentionally public');
    }
  }

  // Warning: unvalidated request.json() 
  if (rel.startsWith('src/app/api/') && content.includes('await request.json()') && !content.includes('validateBody') && !content.includes('parseJson') && !content.includes('safeParse') && !content.includes('z.object')) {
    warn(rel, 'request.json() without Zod validation');
  }
}

function scanDir(dir) {
  try {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory() && !['node_modules', '.next', '.git'].includes(entry)) {
        scanDir(full);
      } else if (['.ts', '.tsx', '.js'].includes(extname(entry))) {
        scanFile(full);
      }
    }
  } catch {}
}

console.log('\n🔐 Security Audit\n');
scanDir(join(process.cwd(), 'src'));
scanDir(join(process.cwd(), 'scripts'));

console.log(`Critical Issues: ${issues.length}`);
issues.forEach(i => console.log(i));

console.log(`\nWarnings: ${warnings.length}`);
warnings.slice(0, 20).forEach(w => console.log(w));
if (warnings.length > 20) console.log(`  ... and ${warnings.length - 20} more`);

if (issues.length > 0) {
  console.log('\n🚨 Fix critical issues before deploying!');
  process.exit(1);
} else {
  console.log('\n✅ No critical security issues found');
}
