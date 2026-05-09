import { loadLocalEnvFiles, isPlaceholderValue } from './env-loader.mjs';

/**
 * Production environment variable checker
 * Run: node scripts/check-production-env.mjs
 * Or:  npm run check:env
 */

const required = [
  ['NEXT_PUBLIC_SUPABASE_URL',      'Supabase → Project Settings → API'],
  ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Supabase → Project Settings → API'],
  ['SUPABASE_SERVICE_ROLE_KEY',     'Supabase → Project Settings → API'],
  ['NEXT_PUBLIC_APP_URL',           'Your production domain: https://yourdomain.com'],
  ['CRON_SECRET',                   'Generate: openssl rand -hex 32'],
];

const recommended = [
  ['ANTHROPIC_API_KEY',           'console.anthropic.com → AI features'],
  ['SENDGRID_API_KEY',            'sendgrid.com → Email delivery'],
  ['SENDGRID_FROM_EMAIL',         'Verified sender email'],
  ['STRIPE_SECRET_KEY',           'stripe.com → Subscription billing'],
  ['STRIPE_WEBHOOK_SECRET',       'stripe.com → Webhook signing secret'],
  ['STRIPE_PRICE_STARTER',        'Stripe product price ID for Starter plan'],
  ['STRIPE_PRICE_STANDARD',       'Stripe product price ID for Standard plan'],
  ['STRIPE_PRICE_PRO',            'Stripe product price ID for Pro plan'],
  ['UPSTASH_REDIS_REST_URL',      'upstash.com → Redis rate limiting'],
  ['UPSTASH_REDIS_REST_TOKEN',    'upstash.com → Redis rate limiting'],
  ['SENTRY_DSN',                  'sentry.io → Error monitoring'],
  ['IOT_WEBHOOK_SECRET',          'Random secret sent by IoT devices/webhooks'],
  ['MOBILE_KEY_VERIFY_SECRET',    'Random secret used by door lock verification calls'],
  ['LINE_CHANNEL_ACCESS_TOKEN',   'LINE Developers → Messaging API'],
  ['LINE_CHANNEL_SECRET',         'LINE Developers → Messaging API'],
];

const optional = [
  ['OMISE_SECRET_KEY',            'omise.co → Payments (Thailand)'],
  ['BOOKING_COM_WEBHOOK_TOKEN',    'Booking.com Connectivity webhook token'],
  ['BOOKING_COM_API_KEY',          'Booking.com Connectivity API key after certification'],
  ['BOOKING_COM_PROPERTY_ID',      'Booking.com property/hotel ID'],
  ['AGODA_WEBHOOK_TOKEN',          'Agoda YCS webhook token'],
  ['AGODA_API_KEY',                'Agoda YCS API key after approval'],
  ['AGODA_PROPERTY_ID',            'Agoda property ID'],
  ['AIRBNB_CLIENT_ID',             'Airbnb Software Partner client ID'],
  ['AIRBNB_CLIENT_SECRET',         'Airbnb Software Partner client secret'],
  ['WHATSAPP_ACCESS_TOKEN',       'Meta → WhatsApp Business API'],
  ['ETAX_USERNAME',               'INET eTax → Thai e-invoice'],
  ['IMMIGRATION_API_KEY',         'immigration.go.th → TM30'],
];

const loadedEnvFiles = loadLocalEnvFiles();

let failed = false;
let failures = 0;
let warnings = 0;

function isUsable(key, value, productionStrict = false) {
  if (!value || isPlaceholderValue(value)) return false;
  if (productionStrict && key === 'NEXT_PUBLIC_APP_URL' && !String(value).startsWith('https://')) return false;
  if (productionStrict && key === 'STRIPE_SECRET_KEY' && !String(value).startsWith('sk_live_')) return false;
  return true;
}

console.log('\n🔍 Maitri Production Environment Check\n');
if (loadedEnvFiles.length) console.log(`Loaded env files: ${loadedEnvFiles.join(', ')}`);
console.log('━'.repeat(50));

console.log('\n✅ REQUIRED (app will not work without these):');
for (const [key, hint] of required) {
  const val = process.env[key];
  if (!val) {
    console.log(`  ❌ ${key}`);
    console.log(`     How to get: ${hint}`);
    failed = true;
    failures++;
  } else if (!isUsable(key, val, process.env.NODE_ENV === 'production')) {
    console.log(`  ❌ ${key} looks like a placeholder or non-production value`);
    failed = true;
    failures++;
  } else {
    const preview = val.length > 20 ? val.slice(0, 8) + '...' + val.slice(-4) : val;
    console.log(`  ✓  ${key} = ${preview}`);
  }
}

console.log('\n⚡ RECOMMENDED (degraded features without these):');
for (const [key, hint] of recommended) {
  const val = process.env[key];
  if (!val) {
    console.log(`  ⚠️  ${key} — MISSING`);
    console.log(`     ${hint}`);
    warnings++;
  } else if (isPlaceholderValue(val)) {
    console.log(`  ⚠️  ${key} — PLACEHOLDER VALUE`);
    warnings++;
  } else {
    console.log(`  ✓  ${key}`);
  }
}

console.log('\n🔧 OPTIONAL (extra integrations):');
for (const [key] of optional) {
  const val = process.env[key];
  console.log(`  ${val ? '✓ ' : '○ '} ${key}`);
}

console.log('\n━'.repeat(50));
if (failed) {
  console.log(`\n❌ ${failures} required vars missing/invalid — fix before deploying!\n`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`\n⚠️  ${warnings} recommended vars missing — some features will be disabled.`);
  console.log('   See PRODUCTION_SETUP.md for setup instructions.\n');
} else {
  console.log('\n✅ All environment variables configured. Ready for production! 🚀\n');
}
