# Secret Rotation Guide (Production)

## Scope
Rotate the following secrets at minimum every 90 days or immediately after a suspected leak:
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `SENDGRID_API_KEY`
- `UPSTASH_REDIS_REST_TOKEN`
- `OMISE_SECRET_KEY` (if used)
- Any webhook signing secrets

## Standard Rotation Flow
1. Create new secret in provider console (do not delete old key yet).
2. Add new value in Vercel Project Settings (Production + Preview as needed).
3. Redeploy and run smoke checks:
   - auth login
   - booking create
   - payment webhook test
   - OTA sync dry run
4. Verify logs have no auth/signature errors.
5. Revoke old key in provider console.
6. Record rotation timestamp and owner in runbook.

## Incident Rotation (Emergency)
1. Invalidate leaked key immediately.
2. Rotate dependent webhooks and callback signatures.
3. Force redeploy all environments.
4. Review audit logs and access logs for suspicious activity.
5. File incident postmortem.

## Operational Notes
- Never commit secrets to Git.
- Use least-privilege keys when provider supports scoped tokens.
- Keep production and staging keys separated.
