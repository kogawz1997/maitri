'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn, formatCurrency } from '@/lib/utils';
import { MapPin, Star } from 'lucide-react';
import { WishlistButton } from '@/components/ui/wishlist-button';

export function HotelCard({ hotel, nights, checkIn, checkOut }: any) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = hotel.gallery || [];
  const heroImg = imgs[imgIdx]?.image_url || hotel.hero_image_url;
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-black/5 group hover:shadow-md transition-shadow">
      <div className="relative h-52 bg-[#FAF7F2] overflow-hidden" onTouchStart={(e)=>setTouchStartX(e.touches[0]?.clientX || null)} onTouchEnd={(e)=>{ if(touchStartX===null||imgs.length<2) return; const dx=(e.changedTouches[0]?.clientX||0)-touchStartX; if(dx>40) setImgIdx((v)=>(v-1+imgs.length)%imgs.length); if(dx<-40) setImgIdx((v)=>(v+1)%imgs.length); setTouchStartX(null); }}>
        {heroImg ? <img src={heroImg} alt={hotel.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center text-5xl text-[#2A2522]/10 font-serif">{hotel.name?.charAt(0)}</div>}
        {imgs.length > 1 && <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">{imgs.slice(0,4).map((_: any,i: number)=><button key={i} onClick={()=>setImgIdx(i)} className={cn('h-1.5 rounded-full transition-all', i===imgIdx?'w-4 bg-white':'w-1.5 bg-white/60')} />)}</div>}
        <div className="absolute top-3 left-3 flex gap-1.5">{hotel.type && <span className="text-2xs bg-white/90 text-[#2A2522] px-2 py-0.5 rounded-full font-medium capitalize">{hotel.type.replace('_', ' ')}</span>}</div>
        <div className="absolute top-3 right-3"><WishlistButton hotelId={hotel.id} /></div>
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-[#2A2522] truncate">{hotel.name}</h3>
            {hotel.city && <p className="text-xs text-[#2A2522]/40 flex items-center gap-1 mt-0.5"><MapPin className="h-3 w-3" />{hotel.city}</p>}
          </div>
          {hotel.avg_rating && <div className="flex items-center gap-1 shrink-0 ml-2"><Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /><span className="text-sm font-bold text-[#2A2522]">{hotel.avg_rating}</span></div>}
        </div>
        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-[#2A2522]/40">เริ่มต้น / คืน</p>
            <p className="text-lg font-bold text-[#2A2522]">{formatCurrency(hotel.min_price || 0)}</p>
          </div>
          <Link href={`/h/${hotel.slug}?checkIn=${checkIn}&checkOut=${checkOut}`} className="px-3 py-2 bg-[#2A2522] text-white text-xs rounded-lg">ดูห้อง</Link>
        </div>
      </div>
    </div>
  );
}
