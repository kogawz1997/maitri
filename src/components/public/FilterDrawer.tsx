'use client';
import { useState } from 'react';
import { X, SlidersHorizontal, Star, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LuxuryButton } from '@/components/luxury/LuxuryButton';

export interface FilterState {
  minPrice:     number;
  maxPrice:     number;
  minRating:    number;
  amenities:    string[];
  breakfast:    boolean;
  freeCancell:  boolean;
  type:         string;
  sort:         string;
}

const DEFAULT_FILTERS: FilterState = {
  minPrice: 0, maxPrice: 50000, minRating: 0,
  amenities: [], breakfast: false, freeCancell: false,
  type: '', sort: 'recommended',
};

const AMENITIES = ['WiFi', 'สระว่ายน้ำ', 'Spa', 'ฟิตเนส', 'ร้านอาหาร', 'บาร์', 'ที่จอดรถ', 'ริมทะเล'];
const TYPES     = [
  { v: '',          l: 'ทั้งหมด' },
  { v: 'hotel',     l: 'Hotel' },
  { v: 'resort',    l: 'Resort' },
  { v: 'boutique',  l: 'Boutique' },
  { v: 'pool_villa',l: 'Pool Villa' },
  { v: 'hostel',    l: 'Hostel' },
];
const SORTS = [
  { v: 'recommended', l: '⭐ แนะนำ' },
  { v: 'price_asc',   l: '💰 ราคาต่ำ-สูง' },
  { v: 'price_desc',  l: '💰 ราคาสูง-ต่ำ' },
  { v: 'rating',      l: '🏆 คะแนนสูง' },
];

interface Props {
  filters:   FilterState;
  onChange:  (f: FilterState) => void;
  onApply:   () => void;
  resultCount?: number;
}

export function FilterDrawer({ filters, onChange, onApply, resultCount }: Props) {
  const [open, setOpen] = useState(false);
  const set = (k: keyof FilterState, v: any) => onChange({ ...filters, [k]: v });

  const activeCount = [
    filters.minPrice > 0,
    filters.maxPrice < 50000,
    filters.minRating > 0,
    filters.amenities.length > 0,
    filters.breakfast,
    filters.freeCancell,
    filters.type !== '',
    filters.sort !== 'recommended',
  ].filter(Boolean).length;

  return (
    <>
      {/* Trigger button */}
      <button onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-1.5 px-4 py-2 border rounded-full text-sm font-medium transition-colors',
          activeCount > 0
            ? 'border-[#C66A30] bg-[#C66A30]/5 text-[#C66A30]'
            : 'border-black/10 text-[#2A2522]/60 hover:border-[#C66A30]/40'
        )}>
        <SlidersHorizontal className="h-3.5 w-3.5" />
        ตัวกรอง {activeCount > 0 && <span className="bg-[#C66A30] text-white rounded-full h-4 w-4 flex items-center justify-center text-xs">{activeCount}</span>}
      </button>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}

      {/* Drawer — bottom sheet on mobile, sidebar on desktop */}
      <div className={cn(
        'fixed z-50 bg-white transition-all duration-300',
        'md:static md:translate-y-0',
        // Mobile: bottom sheet
        open ? 'bottom-0 left-0 right-0 translate-y-0 rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto'
              : 'bottom-0 left-0 right-0 translate-y-full md:block',
        // Desktop: always visible
        'md:rounded-2xl md:border md:border-black/5 md:shadow-none md:overflow-visible'
      )}>
        {/* Handle (mobile) */}
        <div className="md:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-black/15 rounded-full" />
        </div>

        <div className="p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-[#2A2522]">ตัวกรอง</h3>
            <button onClick={() => onChange(DEFAULT_FILTERS)} className="text-xs text-[#C66A30] hover:underline">รีเซ็ต</button>
          </div>

          {/* Sort */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-2">เรียงตาม</p>
            <div className="grid grid-cols-2 gap-2">
              {SORTS.map(s => (
                <button key={s.v} onClick={() => set('sort', s.v)}
                  className={cn('px-3 py-2 rounded-xl text-xs font-medium border transition-all', filters.sort === s.v ? 'bg-[#2A2522] text-white border-[#2A2522]' : 'border-black/8 text-[#2A2522]/60 hover:border-[#2A2522]/20')}>
                  {s.l}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-2">ประเภทที่พัก</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t.v} onClick={() => set('type', t.v)}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all', filters.type === t.v ? 'bg-[#C66A30] text-white border-[#C66A30]' : 'border-black/8 text-[#2A2522]/60 hover:border-[#C66A30]/30')}>
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-2">
              ราคาต่อคืน: ฿{filters.minPrice.toLocaleString()} – {filters.maxPrice >= 50000 ? '฿50,000+' : `฿${filters.maxPrice.toLocaleString()}`}
            </p>
            <input type="range" min={0} max={50000} step={500}
              value={filters.maxPrice} onChange={e => set('maxPrice', Number(e.target.value))}
              className="w-full accent-[#C66A30]" />
          </div>

          {/* Rating */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-2">คะแนนขั้นต่ำ</p>
            <div className="flex gap-2">
              {[0,3,4,4.5].map(r => (
                <button key={r} onClick={() => set('minRating', r)}
                  className={cn('flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border text-xs font-medium transition-all', filters.minRating === r ? 'bg-[#2A2522] text-white border-[#2A2522]' : 'border-black/8 text-[#2A2522]/60 hover:border-[#2A2522]/20')}>
                  {r === 0 ? 'ทั้งหมด' : <><Star className="h-3 w-3 fill-current" />{r}+</>}
                </button>
              ))}
            </div>
          </div>

          {/* Amenities */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-2">สิ่งอำนวยความสะดวก</p>
            <div className="flex flex-wrap gap-2">
              {AMENITIES.map(a => {
                const sel = filters.amenities.includes(a);
                return (
                  <button key={a} onClick={() => set('amenities', sel ? filters.amenities.filter(x => x !== a) : [...filters.amenities, a])}
                    className={cn('px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1', sel ? 'bg-[#C66A30] text-white border-[#C66A30]' : 'border-black/8 text-[#2A2522]/60 hover:border-[#C66A30]/30')}>
                    {sel && <Check className="h-3 w-3" />}{a}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Toggles */}
          <div className="space-y-3 mb-6">
            {[
              { k: 'breakfast' as const, l: '🍳 มีอาหารเช้า' },
              { k: 'freeCancell' as const, l: '✓ ยกเลิกฟรี' },
            ].map(({ k, l }) => (
              <label key={k} className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-[#2A2522]/70">{l}</span>
                <button onClick={() => set(k, !filters[k])}
                  className={cn('relative w-11 h-6 rounded-full transition-colors', filters[k] ? 'bg-[#C66A30]' : 'bg-black/15')}>
                  <div className={cn('absolute top-1 h-4 w-4 bg-white rounded-full shadow transition-transform', filters[k] ? 'translate-x-6' : 'translate-x-1')} />
                </button>
              </label>
            ))}
          </div>

          <LuxuryButton fullWidth onClick={() => { onApply(); setOpen(false); }} className="md:hidden">
            ดูผลลัพธ์{resultCount !== undefined ? ` (${resultCount})` : ''}
          </LuxuryButton>
        </div>
      </div>
    </>
  );
}
