# Maitri Developer API (P4)

## Authentication

Use header:

- `x-api-key: <PUBLIC_API_KEY>`

## Public API

### `GET /api/public/v1/hotels`

Query params:
- `city` (optional)
- `limit` (optional, default 20, max 100)

Response:
```json
{ "items": [], "count": 0 }
```

## Webhook Platform

### `POST /api/webhooks/events`

Headers:
- `x-maitri-signature`: `hex(hmac_sha256(raw_body, WEBHOOK_SIGNING_SECRET))`

Body example:
```json
{ "source": "partner_x", "type": "reservation.created", "data": { "id": "abc" } }
```

Behavior:
- Verifies signature.
- Stores event in `webhook_events` table for downstream processing.
