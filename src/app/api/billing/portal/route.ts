import { NextResponse } from 'next/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { createAdminClient } from '@/lib/supabase/server';
import { createBillingPortalSession } from '@/lib/billing/stripe';
import { rateLimit, requireProductionSecret } from '@/lib/security/rate-limit';
function appUrl() { if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL; if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; return 'http://localhost:3000'; }
export async function POST(request: Request) { try { const limited = await rateLimit(request, 'billing.portal', 10, 60000); if (limited) return limited; const missingStripe = requireProductionSecret('STRIPE_SECRET_KEY'); if (missingStripe) return missingStripe; const ctx = await requireHotelAccess(null, ['owner','admin']); if (ctx.error) return ctx.error; const admin = createAdminClient(); const { data: org } = await admin.from('organizations').select('id, stripe_customer_id').eq('id', ctx.profile.organization_id).single(); if (!org?.stripe_customer_id) return NextResponse.json({ error: 'No billing customer found yet' }, { status: 400 }); const session = await createBillingPortalSession({ customerId: org.stripe_customer_id, returnUrl: `${appUrl()}/dashboard/billing` }); return NextResponse.json({ url: session.url }); } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Billing portal failed' }, { status: 500 }); } }


export async function GET() {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
