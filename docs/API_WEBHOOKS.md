# Maitri API and Webhook Notes

## Required webhook protections
- Verify provider signature.
- Reject stale timestamps.
- Store provider event id for idempotency.
- Log all failures to `operational_events`.

## Payment webhooks
Payment providers must update payment state only through verified webhook events. Client redirects are not proof of payment, because apparently fraud exists.

## OTA webhooks
OTA events must pass through the sync ledger so duplicates and conflicts are visible before changing availability.
