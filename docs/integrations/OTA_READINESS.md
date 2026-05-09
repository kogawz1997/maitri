# OTA Readiness Matrix

Updated: 2026-05-08

## Current Production Position

The OTA layer is **field-ready but not falsely marked as live-direct**. Booking.com, Agoda, and Airbnb workers are guarded by cron auth/rate limits and now fail closed with `skipped` status until real vendor credentials and certification are present.

## Ready in Code

| Capability | Status | Notes |
| --- | --- | --- |
| OTA queue | Ready | `ota_sync_queue` supports pending/retry/done/failed/skipped. |
| Retry/dead-letter support | Ready | Reliability sweep handles stuck/retry/failed queue rows. |
| Booking.com webhook staging | Ready | Token-guarded; maps external property ID to hotel connection before queue insert. |
| Agoda webhook staging | Ready | Token-guarded; maps external property ID to hotel connection before queue insert. |
| Provider workers | Ready/staged | Workers no longer mark fake success; they skip with setup details until certified adapters are wired. |
| Dashboard setup | Ready/staged | Channel setup stores status, property ID, and credentials in the existing schema. |
| Conflict/duplicate tracking | Ready | Duplicate OTA reservation event tracking and conflict audit exist. |

## Direct OTA Live Requirements

| Provider | Required Before Live Sync | Environment Variables |
| --- | --- | --- |
| Booking.com | Connectivity Partner approval, certified XML/API adapter, property ID, webhook token | `BOOKING_COM_WEBHOOK_TOKEN`, `BOOKING_COM_API_KEY`, `BOOKING_COM_PROPERTY_ID` |
| Agoda | YCS API approval, property ID, webhook/API credential | `AGODA_WEBHOOK_TOKEN`, `AGODA_API_KEY`, `AGODA_PROPERTY_ID` |
| Airbnb | Software Partner approval and OAuth client setup | `AIRBNB_CLIENT_ID`, `AIRBNB_CLIENT_SECRET` |

## Recommended Launch Path

For the fastest real hotel launch, use a channel-manager aggregator such as HotelRunner or MyAllocator first. Keep direct OTA provider workers staged until each OTA certifies the integration.

## Validation After Vendor Credentials

```bash
npm run check:env
npm run security-check
BASE_URL=https://your-production-domain.com npm run smoke
curl -H "Authorization: Bearer $CRON_SECRET" https://your-production-domain.com/api/ota/workers/booking-com
curl -H "Authorization: Bearer $CRON_SECRET" https://your-production-domain.com/api/ota/workers/agoda
```

Expected pre-certification result: `skipped` with setup details. Expected post-certification result: provider adapter-specific `success` once the certified push/pull adapter is wired.
