'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCurrency, cn } from '@/lib/utils';
import { Star, Calendar } from 'lucide-react';
import { LuxuryButton } from '@/components/luxury/LuxuryButton';

interface Props {
  hotelSlug: string;
  minRate:   number;
  rating?:   number;
  reviewCount?: number;
  checkIn?:  string;
  checkOut?: string;
}

export function StickyBookingBar({ hotelSlug, minRate, rating, reviewCount, checkIn, checkOut }: Props) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const bookingUrl = `/booking/${hotelSlug}${checkIn ? `?checkIn=${checkIn}&checkOut=${checkOut}` : ''}`;

  return (
    <div className={cn(
      'fixed bottom-0 left-0 right-0 z-30 lg:hidden',
      'bg-white border-t border-black/8 shadow-lg',
      'transition-transform duration-300',
      visible ? 'translate-y-0' : 'translate-y-full',
      // Safe area for iPhone home indicator
      'pb-[env(safe-area-inset-bottom,0px)]'
    )}>
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-[#2A2522]">{formatCurrency(minRate)}</span>
            <span className="text-xs text-[#2A2522]/40">/ คืน</span>
          </div>
          {rating && (
            <div className="flex items-center gap-1 text-xs text-[#2A2522]/50">
              <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
              {rating.toFixed(1)}
              {reviewCount && <span>({reviewCount} รีวิว)</span>}
            </div>
          )}
        </div>
        <Link href={bookingUrl}>
          <LuxuryButton size="md">จองเลย</LuxuryButton>
        </Link>
      </div>
    </div>
  );
}
