# React Native App Blueprint (P4)

This repo now exposes mobile-first routes under `/mobile/*` as parity entrypoints while native packaging is prepared.

## Planned native shells
- Housekeeping: `/mobile/housekeeping`
- Owner analytics: `/mobile/owner-analytics`
- Guest app: `/mobile/guest`

## Next steps for full RN app
1. Create Expo workspace with shared API client.
2. Reuse auth/session tokens from web stack.
3. Wire push notifications + offline queue.
4. Publish iOS/Android release tracks.
