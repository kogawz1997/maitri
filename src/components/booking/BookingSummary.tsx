'use client';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Calendar, Bed, Users, Tag } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

interface Props {
  hotel: { name: string; hero_image_url?: string; city?: string; };
  room?: { name: string; };
  checkIn: string;
  checkOut: string;
  nights: number;
  numAdults: number;
  ratePerNight: number;
  vatRate?: number;
  promoDiscount?: number;
  promoCode?: string;
  collapsible?: boolean;
}

export function BookingSummary({ hotel, room, checkIn, checkOut, nights, numAdults, ratePerNight, vatRate = 0.07, promoDiscount = 0, promoCode, collapsible = false }: Props) {
  const [expanded, setExpanded] = useState(true);

  const subtotal  = ratePerNight * nights;
  const discount  = promoDiscount;
  const afterDisc = subtotal - discount;
  const vat       = Math.round(afterDisc * vatRate);
  const total     = afterDisc + vat;

  return (
    <div className="bg-white rounded-2xl border border-black/8 overflow-hidden sticky top-24">
      {/* Hotel image */}
      {hotel.hero_image_url && (
        <div className="h-36 overflow-hidden">
          <img src={hotel.hero_image_url} alt={hotel.name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#2A2522]">{hotel.name}</h3>
            {hotel.city && <p className="text-xs text-[#2A2522]/40">{hotel.city}</p>}
          </div>
          {collapsible && (
            <button onClick={() => setExpanded(p => !p)} className="p-1 text-[#2A2522]/30">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
        </div>

        {(expanded || !collapsible) && (
          <>
            {/* Dates */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-[#FAF7F2] rounded-xl p-3">
                <p className="text-2xs text-[#2A2522]/40 uppercase tracking-wider mb-0.5">เช็คอิน</p>
                <p className="text-sm font-semibold text-[#2A2522]">{format(parseISO(checkIn+'T00:00:00'), 'd MMM', { locale: th })}</p>
                <p className="text-2xs text-[#2A2522]/40">หลัง 14:00 น.</p>
              </div>
              <div className="bg-[#FAF7F2] rounded-xl p-3">
                <p className="text-2xs text-[#2A2522]/40 uppercase tracking-wider mb-0.5">เช็คเอาท์</p>
                <p className="text-sm font-semibold text-[#2A2522]">{format(parseISO(checkOut+'T00:00:00'), 'd MMM', { locale: th })}</p>
                <p className="text-2xs text-[#2A2522]/40">ก่อน 12:00 น.</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-2 text-sm mb-4">
              <div className="flex items-center gap-2 text-[#2A2522]/60">
                <Calendar className="h-3.5 w-3.5" />{nights} คืน
              </div>
              <div className="flex items-center gap-2 text-[#2A2522]/60">
                <Users className="h-3.5 w-3.5" />{numAdults} ผู้ใหญ่
              </div>
              {room && <div className="flex items-center gap-2 text-[#2A2522]/60"><Bed className="h-3.5 w-3.5" />{room.name}</div>}
            </div>

            <div className="border-t border-black/5 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-[#2A2522]/60">{formatCurrency(ratePerNight)} × {nights} คืน</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-emerald-600">
                  <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />โค้ด {promoCode}</span>
                  <span>-{formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-[#2A2522]/50">
                <span>VAT 7%</span>
                <span>{formatCurrency(vat)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#2A2522] pt-2 border-t border-black/5">
                <span>รวมทั้งสิ้น</span>
                <span className="text-lg">{formatCurrency(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
