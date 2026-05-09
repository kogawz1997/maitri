'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search, MapPin, Calendar, Users, ChevronDown } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface Props {
  initialCity?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialAdults?: number;
  variant?: 'hero' | 'sticky';
}

export function SearchHeader({ initialCity = '', initialCheckIn, initialCheckOut, initialAdults = 2, variant = 'sticky' }: Props) {
  const router = useRouter();
  const [city,    setCity]    = useState(initialCity);
  const [checkIn, setCheckIn] = useState(initialCheckIn || format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [checkOut,setCheckOut]= useState(initialCheckOut || format(addDays(new Date(), 2), 'yyyy-MM-dd'));
  const [adults,  setAdults]  = useState(initialAdults);
  const [focused, setFocused] = useState(false);

  const nights = Math.max(1, Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));

  function handleSearch() {
    const p = new URLSearchParams({ city, checkIn, checkOut, adults: String(adults) });
    router.push(`/search?${p}`);
  }

  if (variant === 'hero') {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-black/8">
            {/* City */}
            <div className="p-4 flex items-center gap-3 col-span-1 md:col-span-1">
              <MapPin className="h-5 w-5 text-[#C66A30] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-0.5">ปลายทาง</p>
                <input value={city} onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="เมือง หรือชื่อโรงแรม"
                  className="w-full bg-transparent text-sm font-medium text-[#2A2522] placeholder:text-[#2A2522]/30 focus:outline-none" />
              </div>
            </div>
            {/* Check-in */}
            <div className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#C66A30] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-0.5">เช็คอิน</p>
                <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="w-full bg-transparent text-sm font-medium text-[#2A2522] focus:outline-none" />
              </div>
            </div>
            {/* Check-out */}
            <div className="p-4 flex items-center gap-3">
              <Calendar className="h-5 w-5 text-[#C66A30] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-0.5">เช็คเอาท์ · {nights} คืน</p>
                <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
                  min={checkIn}
                  className="w-full bg-transparent text-sm font-medium text-[#2A2522] focus:outline-none" />
              </div>
            </div>
            {/* Guests + Search */}
            <div className="p-4 flex items-center gap-3">
              <Users className="h-5 w-5 text-[#C66A30] shrink-0" />
              <div className="flex-1">
                <p className="text-2xs font-semibold text-[#2A2522]/50 uppercase tracking-wider mb-0.5">ผู้เข้าพัก</p>
                <select value={adults} onChange={e => setAdults(Number(e.target.value))}
                  className="w-full bg-transparent text-sm font-medium text-[#2A2522] focus:outline-none">
                  {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} ผู้ใหญ่</option>)}
                </select>
              </div>
              <button onClick={handleSearch}
                className="h-12 w-12 bg-[#C66A30] hover:bg-[#A4522A] text-white rounded-xl flex items-center justify-center transition-colors shadow-lg shadow-[#C66A30]/30 shrink-0">
                <Search className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Sticky variant
  return (
    <div className="flex items-center gap-2 bg-white border border-black/8 rounded-full px-3 py-2 shadow-sm hover:shadow-md transition-shadow cursor-pointer max-w-2xl w-full"
      onClick={() => setFocused(true)}>
      <Search className="h-4 w-4 text-[#C66A30] shrink-0" />
      <input value={city} onChange={e => setCity(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSearch()}
        placeholder="ค้นหาเมือง หรือโรงแรม..."
        className="flex-1 bg-transparent text-sm focus:outline-none text-[#2A2522] placeholder:text-[#2A2522]/40 min-w-0" />
      <div className="hidden md:flex items-center gap-2 border-l border-black/8 pl-3 shrink-0">
        <input type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)}
          className="text-xs bg-transparent focus:outline-none text-[#2A2522]/60 w-28" />
        <span className="text-[#2A2522]/20">→</span>
        <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)}
          className="text-xs bg-transparent focus:outline-none text-[#2A2522]/60 w-28" />
      </div>
      <button onClick={e => { e.stopPropagation(); handleSearch(); }}
        className="h-8 w-8 bg-[#C66A30] text-white rounded-full flex items-center justify-center hover:bg-[#A4522A] transition-colors shrink-0">
        <Search className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
