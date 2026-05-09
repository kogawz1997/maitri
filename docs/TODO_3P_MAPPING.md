# TODO → 4P / Third-Party Mapping

Updated: 2026-05-08
Source of truth: `MASTER_4P_TASKS.md`

The previous mapping was stale: it still showed several OTA/security items as unchecked even though some had already been closed in code, and other items required vendor dashboards rather than source-code work. This file now separates **code complete** from **field-ready external setup**.

## Code-Complete Items

| Area | Item | Status | Evidence |
| --- | --- | --- | --- |
| Payment | Stripe webhook signature/idempotency | DONE | `src/app/api/billing/webhook/route.ts` |
| Payment | Omise webhook idempotency | DONE | `src/app/api/webhooks/omise/route.ts` |
| Payment | Payment/reconcile rate limits and fail-closed provider config | DONE | `src/app/api/payments/reconcile/route.ts`, `src/app/api/payments/receipt/route.ts` |
| Reservation safety | Advisory lock overbooking guard | DONE | `src/lib/booking/availability-lock.ts`, `tests/unit/availability-lock-guards.test.mjs` |
| Security | Rate limits across auth/payment/high-risk routes | DONE | security audit result: 0 warnings |
| Security | Guest brute-force protection | DONE | `src/lib/security/auth-activity.ts`, `src/app/api/guest/auth/login/route.ts` |
| Security | Session/device tracking and IP anomaly audit | DONE | `src/lib/security/auth-activity.ts` |
| Security | Secure upload validation | DONE | `src/lib/security/upload-validation.ts`, storage/image routes |
| OTA | Worker routes guarded by cron token and rate limit | DONE | `src/lib/ota/provider-worker.ts`, `src/app/api/ota/workers/*` |
| OTA | No fake success for direct vendor adapters | DONE | provider workers now mark `skipped` until credentials/certification are present |
| OTA | Webhook route maps external property ID to real hotel ID | DONE | `src/lib/ota/connections.ts`, Booking.com/Agoda webhook routes |
| OTA | Channel dashboard schema alignment | DONE | `src/app/dashboard/channels/channels-client.tsx` |
| IoT/Mobile key | Production fail-closed secrets | DONE | `src/app/api/iot/route.ts`, `src/app/api/mobile-key/route.ts` |

## Field-Ready External/Vendor Items

| Third Party | Status | Why Not Finished in Code | Ready Next Step |
| --- | --- | --- | --- |
| Supabase Email verification | FIELD_READY | Requires production dashboard access | Confirm Auth email verification in Supabase Dashboard and attach screenshot |
| SendGrid | FIELD_READY | Requires verified sender/domain DNS | Verify sender/domain and set `SENDGRID_FROM_EMAIL` |
| Upstash | FIELD_READY | Requires live Redis database | Set `UPSTASH_REDIS_REST_URL` and token, then run smoke/readiness |
| Stripe | FIELD_READY | Requires live account/prices/webhooks | Set live keys/price IDs and validate webhook delivery |
| Omise | FIELD_READY | Requires live account/KYC keys | Set live keys/webhook secret and run test payment/refund |
| Sentry | FIELD_READY | Requires Sentry org/project | Set DSNs and capture one test event |
| Booking.com | FIELD_READY | Requires Connectivity Partner certification and API keys | Set `BOOKING_COM_*` envs and wire certified adapter after approval |
| Agoda | FIELD_READY | Requires Agoda YCS approval/API key | Set `AGODA_*` envs and wire certified adapter after approval |
| Airbnb | FIELD_READY | Requires Software Partner OAuth/client credentials | Set `AIRBNB_*` envs and wire OAuth adapter after approval |
| IoT vendor | FIELD_READY | Requires per-property vendor credentials | Set IoT vendor URL/key and run device sandbox command |
| Mobile key vendor | FIELD_READY | Requires lock vendor credentials/property ID | Set mobile-key vendor envs and run door-lock verification call |

## Verification Results

| Command | Result |
| --- | --- |
| `npm run type-check` | PASS |
| `npm run lint` | PASS, 0 errors, 61 warnings |
| `npm run check` | PASS |
| `npm run security-check` | PASS, 0 critical, 0 warnings |
| `NEXT_TELEMETRY_DISABLED=1 NEXT_BUILD_WORKERS=1 NODE_OPTIONS=--max-old-space-size=4096 npm run build` | PASS |
| `npm run deploy:check` | PASS |

## Launch Notes

- Direct OTA workers are intentionally staged/fail-closed until vendor certification is complete. This prevents false inventory sync success.
- For fastest real hotel launch, use a channel-manager aggregator first, then enable direct OTA connections provider by provider after approval.
- Live smoke/readiness checks must be run after real env values and a deployed production domain exist.
