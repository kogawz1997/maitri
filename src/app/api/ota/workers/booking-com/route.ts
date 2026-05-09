import { runOtaProviderWorker } from '@/lib/ota/provider-worker';

function runWorker(request: Request) {
  return runOtaProviderWorker(request, {
    provider: 'booking_com',
    label: 'Booking.com',
    rateLimitKey: 'ota.worker.booking_com',
    requiredEnv: ['BOOKING_COM_API_KEY', 'BOOKING_COM_PROPERTY_ID'],
    setupUrl: 'docs/integrations/CHANNEL_MANAGER.md#bookingcom-connectivity-partner',
  });
}

export async function GET(request: Request) { return runWorker(request); }
export async function POST(request: Request) { return runWorker(request); }
