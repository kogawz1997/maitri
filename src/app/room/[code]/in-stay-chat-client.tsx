'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Phone, Wifi, ChevronDown, Loader2, CheckCheck, Coffee, Bed, Wrench, UtensilsCrossed, Car, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const QUICK_SERVICES = [
  { icon: Coffee,         label: 'Room Service',        msg: 'ขอสั่งอาหาร/เครื่องดื่ม' },
  { icon: Bed,            label: 'ขอหมอน/ผ้าห่ม',        msg: 'ขอหมอนเพิ่ม/ผ้าห่มเพิ่ม' },
  { icon: Wrench,         label: 'แจ้งซ่อม',             msg: 'มีปัญหาในห้อง ต้องการช่วยเหลือ' },
  { icon: UtensilsCrossed,label: 'อาหารเช้า',             msg: 'สอบถามเวลาและเมนูอาหารเช้า' },
  { icon: Car,            label: 'เรียก Taxi/Transport', msg: 'ต้องการจัดรถรับส่ง' },
  { icon: Clock,          label: 'Late Check-out',       msg: 'ขอ late check-out ได้ไหม?' },
];

interface Msg { role: 'user' | 'assistant'; text: string; time: string; }

export function InStayChatClient({ hotel, room, reservation, knowledge }: { hotel: any; room: any; reservation: any; knowledge: any[] }) {
  const guest = reservation?.guests as any;
  const rt    = room?.room_types as any;
  const [msgs, setMsgs] = useState<Msg[]>([{
    role: 'assistant',
    text: `สวัสดี${guest ? ` คุณ${guest.first_name}` : ''}! 🙏 ยินดีต้อนรับสู่${room ? ` ห้อง ${room.room_number}` : ''}\n\nมีอะไรให้ช่วยเหลือไหมครับ/ค่ะ?`,
    time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  async function send(text?: string) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    const time = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    setMsgs(p => [...p, { role: 'user', text: msg, time }]);
    setLoading(true);

    try {
      const res = await fetch('/api/public/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotel.id,
          message: msg,
          history: msgs.slice(-6).map(m => ({ role: m.role, content: m.text })),
          context: `Guest is currently staying in room ${room?.room_number}. Check-out: ${reservation?.check_out || 'unknown'}.`,
        }),
      });
      const data = await res.json();
      setMsgs(p => [...p, { role: 'assistant', text: data.reply || 'ขออภัย เกิดข้อผิดพลาด', time: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) }]);
    } catch {
      setMsgs(p => [...p, { role: 'assistant', text: 'ขออภัย ขณะนี้ระบบขัดข้อง กรุณาโทร ' + hotel.phone, time: '' }]);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col max-w-md mx-auto">
      {/* Header */}
      <div className="bg-[#2A2522] text-white px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {hotel.logo_url
            ? <img src={hotel.logo_url} alt="logo" className="h-8 object-contain" />
            : <div className="h-8 w-8 bg-[#C66A30] rounded-lg flex items-center justify-center font-bold text-sm">{hotel.name.charAt(0)}</div>
          }
          <div className="flex-1">
            <p className="font-semibold text-sm">{hotel.name}</p>
            <p className="text-white/50 text-xs flex items-center gap-1">
              <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full" />
              {room ? `ห้อง ${room.room_number}` : ''} · พร้อมให้บริการ
            </p>
          </div>
          {hotel.phone && (
            <a href={`tel:${hotel.phone}`} className="p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors">
              <Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>

      {/* Room info bar */}
      {(room || reservation) && (
        <div className="bg-white border-b border-black/5 px-4 py-3 flex items-center gap-4 text-xs text-[#2A2522]/60">
          {room && <span className="flex items-center gap-1"><Bed className="h-3.5 w-3.5" />ห้อง {room.room_number}{room.floor ? ` · ชั้น ${room.floor}` : ''}</span>}
          {rt && <span>{rt.name}</span>}
          {reservation?.check_out && <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Check-out {reservation.check_out}</span>}
          <div className="ml-auto flex items-center gap-1 text-emerald-600"><Wifi className="h-3.5 w-3.5" />WiFi ใช้ได้</div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex gap-2', m.role === 'user' ? 'flex-row-reverse' : 'flex-row')}>
            {m.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full bg-[#2A2522] flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5">
                {hotel.name.charAt(0)}
              </div>
            )}
            <div className={cn('max-w-[78%]', m.role === 'user' ? 'items-end' : 'items-start', 'flex flex-col gap-1')}>
              <div className={cn('px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed',
                m.role === 'assistant'
                  ? 'bg-white text-[#2A2522] rounded-tl-sm shadow-sm'
                  : 'bg-[#C66A30] text-white rounded-tr-sm')}>
                {m.text.split('\n').map((line, j) => <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>)}
              </div>
              {m.time && <span className="text-2xs text-[#2A2522]/30 px-1">{m.time} {m.role === 'user' && <CheckCheck className="h-3 w-3 inline text-[#2A2522]/30" />}</span>}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="h-7 w-7 rounded-full bg-[#2A2522] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{hotel.name.charAt(0)}</span>
            </div>
            <div className="bg-white px-3.5 py-2.5 rounded-2xl rounded-tl-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin text-[#2A2522]/40" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick services */}
      {msgs.length <= 2 && (
        <div className="px-4 py-3 bg-white border-t border-black/5">
          <p className="text-xs text-[#2A2522]/40 mb-2 uppercase tracking-wider">บริการด่วน</p>
          <div className="grid grid-cols-3 gap-2">
            {QUICK_SERVICES.map(s => {
              const Icon = s.icon;
              return (
                <button key={s.label} onClick={() => send(s.msg)}
                  className="flex flex-col items-center gap-1 p-2.5 bg-[#FAF7F2] rounded-xl text-center hover:bg-[#C66A30]/10 transition-colors">
                  <Icon className="h-4 w-4 text-[#C66A30]" />
                  <span className="text-2xs text-[#2A2522]/70 leading-tight">{s.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 bg-white border-t border-black/5 safe-area-pb">
        <div className="flex items-center gap-2">
          <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="พิมพ์ข้อความหรือคำขอ..."
            className="flex-1 px-4 py-2.5 bg-[#FAF7F2] rounded-full text-sm focus:outline-none" />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="h-10 w-10 bg-[#C66A30] disabled:bg-[#C66A30]/30 text-white rounded-full flex items-center justify-center transition-colors">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
