import { runOtaProviderWorker } from '@/lib/ota/provider-worker';

function runWorker(request: Request) {
  return runOtaProviderWorker(request, {
    provider: 'airbnb',
    label: 'Airbnb',
    rateLimitKey: 'ota.worker.airbnb',
    requiredEnv: ['AIRBNB_CLIENT_ID', 'AIRBNB_CLIENT_SECRET'],
    setupUrl: 'docs/integrations/CHANNEL_MANAGER.md#airbnb',
  });
}

export async function GET(request: Request) { return runWorker(request); }
export async function POST(request: Request) { return runWorker(request); }
