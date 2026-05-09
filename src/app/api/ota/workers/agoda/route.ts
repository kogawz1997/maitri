import { runOtaProviderWorker } from '@/lib/ota/provider-worker';

function runWorker(request: Request) {
  return runOtaProviderWorker(request, {
    provider: 'agoda',
    label: 'Agoda',
    rateLimitKey: 'ota.worker.agoda',
    requiredEnv: ['AGODA_API_KEY', 'AGODA_PROPERTY_ID'],
    setupUrl: 'docs/integrations/CHANNEL_MANAGER.md#agoda-ycs',
  });
}

export async function GET(request: Request) { return runWorker(request); }
export async function POST(request: Request) { return runWorker(request); }
