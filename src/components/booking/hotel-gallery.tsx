'use client';

import { useState } from 'react';
import { Grid, X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  images: { url: string; alt?: string }[];
  hotelName: string;
}

export function HotelGallery({ images, hotelName }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="h-72 bg-gradient-to-br from-[#2A2522] to-[#4a3c35] flex items-center justify-center">
        <span className="text-white/10 text-8xl font-serif">{hotelName.charAt(0)}</span>
      </div>
    );
  }

  const show1 = images[0];
  const show2 = images.slice(1, 5);
  const total = images.length;

  return (
    <>
      {/* Grid */}
      <div className="relative">
        {images.length === 1 ? (
          <div className="h-72 md:h-[420px] overflow-hidden cursor-pointer" onClick={() => setLightbox(0)}>
            <img src={show1.url} alt={show1.alt || hotelName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          </div>
        ) : (
          <div className="grid grid-cols-4 grid-rows-2 gap-1.5 h-72 md:h-[420px]">
            {/* Main large */}
            <div className="col-span-2 row-span-2 overflow-hidden cursor-pointer" onClick={() => setLightbox(0)}>
              <img src={show1.url} alt={show1.alt || hotelName} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" />
            </div>
            {/* 4 small */}
            {show2.map((img, i) => (
              <div key={i} className="relative overflow-hidden cursor-pointer" onClick={() => setLightbox(i + 1)}>
                <img src={img.url} alt={img.alt || ''} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
                {/* Show all button on last small image */}
                {i === 3 && total > 5 && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white hover:bg-black/60 transition-colors">
                    <Grid className="h-5 w-5 mb-1" />
                    <span className="text-sm font-medium">+{total - 5} รูป</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Show all button */}
        {total > 1 && (
          <button onClick={() => setLightbox(0)}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-white text-[#2A2522] text-sm font-medium px-4 py-2 rounded-xl shadow-lg hover:bg-gray-50 transition-colors border border-black/10">
            <Grid className="h-4 w-4" />
            ดูรูปทั้งหมด ({total})
          </button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={() => setLightbox(null)}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 shrink-0">
            <span className="text-white/60 text-sm">{lightbox + 1} / {total}</span>
            <button onClick={() => setLightbox(null)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
              <X className="h-5 w-5 text-white" />
            </button>
          </div>

          {/* Main image */}
          <div className="flex-1 flex items-center justify-center px-4" onClick={e => e.stopPropagation()}>
            <img src={images[lightbox]?.url} alt={images[lightbox]?.alt || ''}
              className="max-w-full max-h-full object-contain" />
          </div>

          {/* Arrows */}
          {total > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); setLightbox(p => (p! - 1 + total) % total); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <ChevronLeft className="h-5 w-5 text-white" />
              </button>
              <button onClick={e => { e.stopPropagation(); setLightbox(p => (p! + 1) % total); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
                <ChevronRight className="h-5 w-5 text-white" />
              </button>
            </>
          )}

          {/* Thumbnails */}
          <div className="px-4 pb-4 shrink-0">
            <div className="flex gap-2 overflow-x-auto justify-center" onClick={e => e.stopPropagation()}>
              {images.map((img, i) => (
                <button key={i} onClick={() => setLightbox(i)}
                  className={`shrink-0 h-14 w-20 rounded-lg overflow-hidden border-2 transition-all ${i === lightbox ? 'border-white' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
