# Round 4 Closed — Final Hardening Pass

This pass tightens the remaining production edges after the 3-round implementation.

## Changes

- Replaced deprecated `next lint` script with standalone ESLint command.
- Added `.eslintrc.json` for Next core-web-vitals linting.
- Added `next-env.d.ts` so TypeScript/Next builds have the expected generated typings in fresh clones.
- Pinned Node runtime to `20.x` in `package.json` for consistent Vercel builds.
- Cleaned `.env.production.example` duplicate critical keys and added all live integration placeholders in one place.
- Wired TM30 pending reminder cron to `sendOpsAlert()` and `operational_events`.
- Wired Stripe invoice payment failure webhook to `sendOpsAlert()` and `operational_events`.
- Added `test:final` static hardening verification.

## Verification

Run locally or in CI:

```bash
npm run test:core-ops
npm run test:saas-integrations
npm run test:ops
npm run test:final
```

Full production check remains:

```bash
npm ci
npm run type-check
npm run build
npm run check
npm run release:check
```

## Notes

The static checks pass in this patch. Full TypeScript/build verification still requires a complete dependency install in a normal local/Vercel environment.
