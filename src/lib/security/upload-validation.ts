import { z } from 'zod';

export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;
export const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif'] as const;

export const storageObjectPathSchema = z
  .string()
  .trim()
  .min(1)
  .max(512)
  .refine((value) => !value.includes('..') && !value.startsWith('/') && !value.includes('\\'), {
    message: 'Invalid storage path',
  })
  .refine((value) => hasAllowedImageExtension(value), {
    message: 'Unsupported image extension',
  });

export const publicImageUrlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((value) => isSafePublicImageUrl(value), {
    message: 'Image URL must be HTTPS or a safe local asset path and must point to an allowed image type',
  });

export function hasAllowedImageExtension(value: string) {
  const lowerPath = value.split('?')[0].split('#')[0].toLowerCase();
  return ALLOWED_IMAGE_EXTENSIONS.some((extension) => lowerPath.endsWith(extension));
}

export function isSafePublicImageUrl(value: string) {
  if (value.startsWith('/')) {
    return !value.includes('..') && hasAllowedImageExtension(value);
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    return hasAllowedImageExtension(url.pathname);
  } catch {
    return false;
  }
}
