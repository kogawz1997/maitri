'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

type LuxuryGalleryImage = {
  id?: string | number;
  url: string;
  alt?: string;
};

type LuxuryGalleryProps = {
  images: LuxuryGalleryImage[];
  hotelName?: string;
  className?: string;
};

export function LuxuryGallery({ images, hotelName = 'Hotel', className }: LuxuryGalleryProps) {
  const safeImages = useMemo(() => images.filter((img) => Boolean(img?.url)), [images]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (!safeImages.length) {
    return (
      <div className={cn('rounded-2xl border border-black/10 bg-[#FAF7F2] p-8 text-center text-sm text-[#2A2522]/60', className)}>
        ยังไม่มีรูปภาพของโรงแรมนี้
      </div>
    );
  }

  const activeImage = safeImages[Math.min(activeIndex, safeImages.length - 1)];

  return (
    <section className={cn('space-y-3', className)} aria-label="Luxury gallery">
      <div className="relative overflow-hidden rounded-2xl bg-[#FAF7F2]">
        <img
          src={activeImage.url}
          alt={activeImage.alt || `${hotelName} photo ${activeIndex + 1}`}
          className="h-[280px] w-full object-cover md:h-[420px]"
        />
      </div>

      {safeImages.length > 1 && (
        <div className="grid grid-cols-4 gap-2 md:grid-cols-6">
          {safeImages.slice(0, 12).map((img, index) => (
            <button
              key={img.id ?? `${img.url}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={cn(
                'overflow-hidden rounded-lg border-2 transition-all',
                activeIndex === index
                  ? 'border-[#C66A30] ring-2 ring-[#C66A30]/20'
                  : 'border-transparent opacity-80 hover:opacity-100'
              )}
              aria-label={`ดูรูปที่ ${index + 1}`}
            >
              <img src={img.url} alt={img.alt || `${hotelName} thumbnail ${index + 1}`} className="h-16 w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
