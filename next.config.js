/**
 * Sentry wrapper — only active when SENTRY_DSN is set
 * Install: npm install @sentry/nextjs
 */
let withSentryConfig = (config) => config; // passthrough until Sentry installed
try {
  const { withSentryConfig: _wrap } = require('@sentry/nextjs');
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    withSentryConfig = (config) => _wrap(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: true,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    });
  }
} catch {}

/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV !== 'production';

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "form-action 'self' https://checkout.stripe.com",
  `script-src 'self' ${isDev ? "'unsafe-eval' 'unsafe-inline'" : "'unsafe-inline'"} https://js.stripe.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://api.anthropic.com https://sentry.io https://*.sentry.io",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://checkout.stripe.com",
  "upgrade-insecure-requests",
].join('; ');

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Content-Security-Policy', value: csp },
];

const buildWorkers = Number(process.env.NEXT_BUILD_WORKERS || 1);

const nextConfig = {
  poweredByHeader: false,
  experimental: {
    // Keep production builds reliable on smaller CI/Vercel/Docker runners.
    // Override with NEXT_BUILD_WORKERS when a larger runner is available.
    cpus: buildWorkers,
    workerThreads: false,
    staticGenerationMaxConcurrency: Math.max(1, buildWorkers),
    staticGenerationMinPagesPerWorker: 5,
    webpackMemoryOptimizations: true,
  },
  eslint: {
    // Keep CI/dev linting via explicit `npm run lint`, but avoid warning noise in `next build`.
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.cache = false;
    config.ignoreWarnings = [
      ...(config.ignoreWarnings || []),
      { module: /@opentelemetry\/instrumentation/, message: /Critical dependency: the request of a dependency is an expression/ },
    ];
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

module.exports = withSentryConfig(nextConfig);
