/**
 * Sentry — Client-side error tracking
 * Setup: https://sentry.io → Create Project → Next.js → copy DSN
 * Then add to Vercel env vars: NEXT_PUBLIC_SENTRY_DSN
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring (1% sample in prod to save quota)
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,

  // Replay for session recording (only on errors)
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.0,

  // Ignore common noise
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Non-Error promise rejection captured',
    /^Loading chunk \d+ failed/,
    'Network request failed',
  ],

  integrations: [
    Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true }),
  ],

  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === 'development') return null;
    return event;
  },
});
