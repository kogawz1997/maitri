import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SetupClient } from './setup-client';


export const dynamic = 'force-dynamic';
export default async function SetupPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');
  const { data: profile } = await supabase
    .from('user_profiles').select('role, organization_id').eq('id', user.id).single();
  if (!['owner', 'admin'].includes(profile?.role || '')) redirect('/dashboard');

  // Check which services are actually configured
  const services = {
    upstash:   !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
    stripe:    !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET),
    sendgrid:  !!(process.env.SENDGRID_API_KEY),
    sentry:    !!(process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN),
    line:      !!(process.env.LINE_CHANNEL_ACCESS_TOKEN && process.env.LINE_CHANNEL_SECRET),
    anthropic: !!(process.env.ANTHROPIC_API_KEY),
    omise:     !!(process.env.OMISE_SECRET_KEY),
    whatsapp:  !!(process.env.WHATSAPP_ACCESS_TOKEN),
  };

  return <SetupClient services={services} />;
}
