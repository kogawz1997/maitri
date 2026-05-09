import { createAdminClient } from '@/lib/supabase/server';
import { requireHotelAccess } from '@/lib/auth/guards';
import { parseJson } from '@/lib/http/validation';
import { ALLOWED_IMAGE_MIME_TYPES } from '@/lib/security/upload-validation';
import { rateLimit } from '@/lib/security/rate-limit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UploadBucketRequestSchema = z.object({
  hotelId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await rateLimit(request, 'storage.upload.prepare', 20, 60_000);
    if (limited) return limited;

    const parsed = await parseJson(request, UploadBucketRequestSchema);
    if (parsed.error) return parsed.error;

    const { hotelId } = parsed.data;
    const ctx = await requireHotelAccess(hotelId, ['owner', 'admin', 'manager']);
    if (ctx.error) return ctx.error;

    const admin = createAdminClient();

    // Check if bucket exists, create if not. Keep this endpoint metadata-only:
    // actual uploads still go directly to Supabase Storage with bucket MIME/size rules enforced.
    const { data: buckets } = await admin.storage.listBuckets();
    const hasHotelAssets = buckets?.some((bucket: any) => bucket.name === 'hotel-assets');

    if (!hasHotelAssets) {
      await admin.storage.createBucket('hotel-assets', {
        public: true,
        fileSizeLimit: 10 * 1024 * 1024,
        allowedMimeTypes: [...ALLOWED_IMAGE_MIME_TYPES],
      });
    }

    return NextResponse.json({
      success: true,
      bucket: 'hotel-assets',
      constraints: {
        maxBytes: 10 * 1024 * 1024,
        allowedMimeTypes: ALLOWED_IMAGE_MIME_TYPES,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
