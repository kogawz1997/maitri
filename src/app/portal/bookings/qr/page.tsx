'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { CheckCircle2, Bed, Calendar, MapPin, Clock, Download } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';

function QRContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const supabase = createClient();
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) { setError('ไม่พบรหัสการจอง'); setLoading(false); return; }
    async function load() {
      const { data } = await supabase
        .from('reservations')
        .select(`
          reservation_code, status, check_in, check_out, nights,
          total_amount, num_adults, special_requests, estimated_arrival,
          guests(first_name, last_name),
          rooms(room_number, floor),
          room_types(name, amenities),
          hotels(name, city, address, phone, check_in_time, check_out_time, logo_url)
        `)
        .eq('reservation_code', code.toUpperCase())
        .single();
      if (!data) { setError('ไม่พบการจองนี้'); } else { setReservation(data); }
      setLoading(false);
    }
    load();
  }, [code]);

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="h-8 w-8 border-2 border-[#C66A30]/30 border-t-[#C66A30] rounded-full animate-spin" />
    </div>
  );

  if (error || !reservation) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-center px-4">
      <div className="text-5xl">😕</div>
      <h2 className="text-lg font-semibold text-[#2A2522]">{error || 'ไม่พบการจอง'}</h2>
      <Link href="/portal/bookings" className="text-sm text-[#C66A30] hover:underline">← กลับ My Bookings</Link>
    </div>
  );

  const hotel = reservation.hotels as any;
  const guest = reservation.guests as any;
  const rt    = reservation.room_types as any;
  const room  = reservation.rooms as any;
  const status = reservation.status;
  const statusColor = { confirmed: 'text-sky-600', checked_in: 'text-emerald-600', checked_out: 'text-gray-400' }[status] || 'text-gray-500';

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Hotel logo / name */}
        <div className="text-center mb-6">
          {hotel?.logo_url
            ? <img src={hotel.logo_url} alt={hotel.name} className="h-10 mx-auto mb-2 object-contain" />
            : <div className="text-xl font-bold text-[#2A2522]">{hotel?.name}</div>
          }
          {hotel?.city && <p className="text-xs text-[#2A2522]/40 flex items-center justify-center gap-1"><MapPin className="h-3 w-3" />{hotel.city}</p>}
        </div>

        {/* QR Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-black/5 overflow-hidden">
          {/* Status bar */}
          <div className={`h-1.5 w-full ${status === 'checked_in' ? 'bg-emerald-500' : 'bg-[#C66A30]'}`} />

          <div className="p-6">
            {/* Code */}
            <div className="text-center mb-6">
              <p className="text-xs text-[#2A2522]/40 uppercase tracking-widest mb-1">รหัสการจอง</p>
              <p className="font-mono text-3xl font-bold text-[#C66A30] tracking-[0.2em]">{reservation.reservation_code}</p>
              <p className={`text-xs font-medium mt-1 ${statusColor}`}>
                {status === 'confirmed' ? '✓ ยืนยันแล้ว' : status === 'checked_in' ? '✓ เช็คอินแล้ว' : status}
              </p>
            </div>

            {/* QR code (encoded URL for staff to scan) */}
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-[#FAF7F2] rounded-2xl">
                {/* SVG QR placeholder — in production use qrcode.react or similar */}
                <div className="h-40 w-40 bg-[#2A2522] rounded-xl flex items-center justify-center">
                  <div className="grid grid-cols-5 gap-1 p-3">
                    {Array.from({ length: 25 }).map((_, i) => (
                      <div key={i} className={`h-5 w-5 rounded-sm ${[0,1,2,3,4,5,9,10,14,15,19,20,21,22,23,24,6,12,18,7,11,17].includes(i) ? 'bg-white' : 'bg-[#2A2522]'}`} />
                    ))}
                  </div>
                </div>
                <p className="text-2xs text-[#2A2522]/40 text-center mt-2">แสดงให้ Staff Scan</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3 border-t border-black/5 pt-4">
              <Row icon={<Calendar className="h-4 w-4 text-[#C66A30]" />}
                label="เช็คอิน"
                value={`${format(parseISO(reservation.check_in+'T00:00:00'), 'EEE d MMM yyyy', { locale: th })} · หลัง ${hotel?.check_in_time || '14:00'}`} />
              <Row icon={<Calendar className="h-4 w-4 text-[#C66A30]" />}
                label="เช็คเอาท์"
                value={`${format(parseISO(reservation.check_out+'T00:00:00'), 'EEE d MMM yyyy', { locale: th })} · ก่อน ${hotel?.check_out_time || '12:00'}`} />
              <Row icon={<Bed className="h-4 w-4 text-[#C66A30]" />}
                label="ห้องพัก"
                value={`${rt?.name || '—'}${room?.room_number ? ` · ห้อง ${room.room_number}` : ''}`} />
              {guest && (
                <Row icon={<CheckCircle2 className="h-4 w-4 text-[#C66A30]" />}
                  label="ชื่อผู้เข้าพัก"
                  value={`${guest.first_name} ${guest.last_name || ''}`.trim()} />
              )}
              {reservation.estimated_arrival && (
                <Row icon={<Clock className="h-4 w-4 text-[#C66A30]" />}
                  label="เวลาเช็คอิน (ประมาณ)"
                  value={reservation.estimated_arrival} />
              )}
            </div>

            {reservation.special_requests && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <span className="font-semibold">คำขอพิเศษ: </span>{reservation.special_requests}
              </div>
            )}

            {/* Total */}
            <div className="mt-4 pt-4 border-t border-black/5 flex justify-between items-center">
              <span className="text-sm text-[#2A2522]/60">ยอดรวม</span>
              <span className="font-bold text-lg text-[#2A2522]">{formatCurrency(reservation.total_amount)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-4">
          <button onClick={() => window.print()}
            className="flex-1 flex items-center justify-center gap-2 py-3 border border-black/10 bg-white rounded-xl text-sm font-medium text-[#2A2522]/70 hover:bg-black/5 transition-colors">
            <Download className="h-4 w-4" /> บันทึก
          </button>
          <Link href="/portal/bookings" className="flex-1 flex items-center justify-center py-3 bg-[#2A2522] text-white rounded-xl text-sm font-medium hover:bg-black transition-colors">
            My Bookings
          </Link>
        </div>

        {hotel?.phone && (
          <p className="text-center text-xs text-[#2A2522]/40 mt-4">
            ติดต่อโรงแรม: <a href={`tel:${hotel.phone}`} className="text-[#C66A30]">{hotel.phone}</a>
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs text-[#2A2522]/40">{label}</p>
        <p className="text-sm font-medium text-[#2A2522] break-words">{value}</p>
      </div>
    </div>
  );
}

export default function QRPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><div className="h-8 w-8 border-2 border-[#C66A30]/30 border-t-[#C66A30] rounded-full animate-spin" /></div>}>
      <QRContent />
    </Suspense>
  );
}
