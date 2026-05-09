# Maitri PMS — Phase 1 Closure Patch

Status: Phase 1 code patch applied and `npm run type-check` passes locally.

## Closed in this patch

1. Auth / session durability
   - Added `bootstrapOwnerAccount()` to make organization + hotel + owner profile creation idempotent.
   - `/api/auth/setup-organization` now upserts safely instead of failing when a partial profile exists.
   - `/onboarding` self-heals accounts that signed up with email verification and reached onboarding without a profile/org yet.

2. Onboarding gate
   - Dashboard is blocked until these exist:
     - active user profile
     - organization id
     - hotel
     - at least one room type
     - at least one room
     - `user_profiles.onboarding_completed = true`
   - Middleware and dashboard layout now enforce the same gate.

3. Role / permission guard
   - Middleware blocks protected dashboard sections by role.
   - Sidebar and mobile nav hide unauthorized sections.
   - Owner/Admin-only areas: Audit, System, Branding.
   - Owner/Admin/Manager areas: Rates, Channels, Marketing, Accounting, Reports, F&B, Spa, Loyalty, Settings.

4. Tenant security / DB readiness
   - Added migration `00007_phase1_closure.sql`.
   - Adds `onboarding_completed` and `last_login_at` to `user_profiles`.
   - Rewrites key RLS policies with `WITH CHECK` for reservations, guests, conversations, messages.
   - Adds final P1 hot-path indexes for profile/org/hotel/rooms/reservations/guests.

5. Build safety
   - Removed `next/font/google` dependency from root layout so Vercel/local builds do not stall on Google Fonts fetch.
   - Added local font CSS variables as fallback.
   - Fixed strict TypeScript errors across public APIs, booking, onboarding, portal, branding, and hotel page.

## Verified locally

```bash
npm ci --no-audit --no-fund --progress=false --prefer-offline
npm run type-check
```

`npm run type-check` passes.

## Build note

`npm run build` was started after type-check passed, but the sandbox timed out during the Next.js compile stage. The previous Google Fonts network blocker was removed. Run the build on Vercel or your local machine with more time/resources.

## Required Supabase step

Run migrations through `supabase db push` or paste/run the new SQL migration in Supabase SQL editor before testing onboarding/dashboard in production.
