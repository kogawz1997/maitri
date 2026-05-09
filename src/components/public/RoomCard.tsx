'use client';
import { useState } from 'react';
import { Users, Maximize2, Bed, Coffee, X, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { LuxuryButton } from '@/components/luxury/LuxuryButton';
import { LuxuryBadge } from '@/components/luxury/LuxuryBadge';
import { getPolicyDescription } from '@/lib/booking/cancellation-policy';

interface RoomCardProps {
  room: {
    id: string;
    name: string;
    description?: string;
    size_sqm?: number;
    max_occupancy: number;
    bed_type?: string;
    amenities?: string[];
    base_rate: number;
    effective_rate: number;
    available_rooms: number;
    is_available: boolean;
    cancellation_policy?: string;
    breakfast_included?: boolean;
    room_type_images?: { image_url: string; display_order: number }[];
  };
  nights: number;
  onSelect: (roomId: string) => void;
  selected?: boolean;
}

export function RoomCard({ room, nights, onSelect, selected }: RoomCardProps) {
  const [imgIdx, setImgIdx] = useState(0);
  const imgs = (room.room_type_images || []).sort((a, b) => a.display_order - b.display_order);
  const img  = imgs[imgIdx]?.image_url;
  const total = room.effective_rate * nights;
  const isLast = room.available_rooms <= 3 && room.available_rooms > 0;

  return (
    <div className={cn(
      'bg-white rounded-2xl border-2 overflow-hidden transition-all duration-300',
      selected ? 'border-[#C66A30] shadow-lg shadow-[#C66A30]/10' : 'border-black/5 hover:border-[#C66A30]/30 hover:shadow-md'
    )}>
      <div className="flex flex-col md:flex-row">
        {/* Image */}
        <div className="relative md:w-56 h-48 md:h-auto bg-[#FAF7F2] shrink-0 overflow-hidden">
          {img ? (
            <img src={img} alt={room.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Bed className="h-12 w-12 text-[#2A2522]/10" />
            </div>
          )}
          {imgs.length > 1 && (
            <div className="absolute bottom-2 right-2 flex gap-1">
              {imgs.slice(0, 4).map((_, i) => (
                <button key={i} onClick={() => setImgIdx(i)}
                  className={cn('h-1.5 rounded-full transition-all', i === imgIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/60')} />
              ))}
            </div>
          )}
          {isLast && (
            <div className="absolute top-2 left-2">
              <LuxuryBadge variant="rose" className="text-2xs">🔥 เหลือ {room.available_rooms} ห้อง</LuxuryBadge>
            </div>
          )}
          {!room.is_available && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <span className="text-white font-semibold text-sm">ห้องเต็ม</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="font-bold text-[#2A2522] text-lg leading-tight">{room.name}</h3>
              {room.description && (
                <p className="text-sm text-[#2A2522]/50 mt-0.5 line-clamp-2">{room.description}</p>
              )}
            </div>
          </div>

          {/* Specs */}
          <div className="flex flex-wrap gap-3 text-xs text-[#2A2522]/50 mb-3">
            {room.size_sqm && <span className="flex items-center gap-1"><Maximize2 className="h-3.5 w-3.5" />{room.size_sqm} ตร.ม.</span>}
            <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />สูงสุด {room.max_occupancy} คน</span>
            {room.bed_type && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />{room.bed_type}</span>}
          </div>

          {/* Amenities */}
          {(room.amenities || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {room.amenities!.slice(0, 5).map(a => (
                <span key={a} className="text-2xs bg-[#FAF7F2] text-[#2A2522]/60 px-2 py-0.5 rounded-full">{a}</span>
              ))}
              {room.amenities!.length > 5 && (
                <span className="text-2xs text-[#2A2522]/40">+{room.amenities!.length - 5} อื่นๆ</span>
              )}
            </div>
          )}

          {/* Policy tags */}
          <div className="flex flex-wrap gap-2 mb-4">
            {room.breakfast_included && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Coffee className="h-3 w-3" /> อาหารเช้ารวม
              </span>
            )}
            {room.cancellation_policy && room.cancellation_policy !== 'non_refundable' ? (
              <span className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
                <Check className="h-3 w-3" /> {getPolicyDescription(room.cancellation_policy as any)}
              </span>
            ) : room.cancellation_policy === 'non_refundable' ? (
              <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                <AlertTriangle className="h-3 w-3" /> ไม่คืนเงิน
              </span>
            ) : null}
          </div>

          {/* Price + CTA */}
          <div className="mt-auto flex items-end justify-between">
            <div>
              {room.effective_rate !== room.base_rate && (
                <p className="text-xs text-[#2A2522]/30 line-through">{formatCurrency(room.base_rate)}/คืน</p>
              )}
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-[#2A2522]">{formatCurrency(room.effective_rate)}</span>
                <span className="text-xs text-[#2A2522]/40">/คืน</span>
              </div>
              <p className="text-xs text-[#2A2522]/40">
                รวม {nights} คืน = <strong className="text-[#2A2522]">{formatCurrency(total)}</strong>
                <span className="ml-1">(รวม VAT)</span>
              </p>
            </div>

            {room.is_available ? (
              <LuxuryButton
                variant={selected ? 'secondary' : 'primary'}
                size="md"
                onClick={() => onSelect(room.id)}
                className="shrink-0 ml-4"
              >
                {selected ? <><Check className="h-4 w-4" /> เลือกแล้ว</> : <>เลือกห้องนี้ <ChevronRight className="h-4 w-4" /></>}
              </LuxuryButton>
            ) : (
              <span className="text-sm text-[#2A2522]/40 font-medium">ห้องเต็ม</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
