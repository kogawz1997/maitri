/**
 * Sentry — Server-side error tracking
 */
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.01 : 1.0,
  beforeSend(event) {
    if (process.env.NODE_ENV === 'development') return null;
    return event;
  },
});
