'use client';
import Link from 'next/link';
import { CheckCircle2, Calendar, Bed, Download, QrCode, Share2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { LuxuryButton } from '@/components/luxury/LuxuryButton';

interface Props {
  reservation: {
    reservation_code: string;
    check_in: string;
    check_out: string;
    nights: number;
    total_amount: number;
    status: string;
    payment_status: string;
    room_types?: { name: string };
    hotels?: { name: string; phone?: string; check_in_time?: string };
    guests?: { first_name: string; last_name?: string; email?: string };
  };
  paymentMethod?: string;
}

export function ConfirmationCard({ reservation: r, paymentMethod }: Props) {
  const hotel  = r.hotels as any;
  const rt     = r.room_types as any;
  const guest  = r.guests as any;
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  return (
    <div className="max-w-lg mx-auto">
      {/* Success header */}
      <div className="text-center mb-8">
        <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="h-10 w-10 text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-[#2A2522] mb-1">จองสำเร็จแล้ว!</h1>
        <p className="text-[#2A2522]/50">
          {guest?.email ? `ส่งยืนยันไปที่ ${guest.email} แล้ว` : 'บันทึกรหัสการจองไว้'}
        </p>
      </div>

      {/* Booking card */}
      <div className="bg-white rounded-3xl border border-black/8 overflow-hidden shadow-lg mb-6">
        {/* Code */}
        <div className="bg-[#2A2522] p-6 text-center">
          <p className="text-white/50 text-xs uppercase tracking-widest mb-2">รหัสการจอง</p>
          <p className="font-mono text-3xl font-bold text-[#C66A30] tracking-[0.2em]">{r.reservation_code}</p>
          <p className="text-white/40 text-xs mt-2">แสดงรหัสนี้เมื่อเช็คอิน</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Hotel */}
          <div>
            <p className="text-xs text-[#2A2522]/40 uppercase tracking-wider mb-1">ที่พัก</p>
            <p className="font-semibold text-[#2A2522]">{hotel?.name}</p>
            {rt && <p className="text-sm text-[#2A2522]/60">{rt.name}</p>}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#FAF7F2] rounded-xl p-3">
              <p className="text-2xs text-[#2A2522]/40 mb-0.5">เช็คอิน</p>
              <p className="font-semibold text-[#2A2522] text-sm">{format(parseISO(r.check_in+'T00:00:00'), 'EEE d MMM', { locale: th })}</p>
              <p className="text-2xs text-[#2A2522]/40">หลัง {hotel?.check_in_time || '14:00'}</p>
            </div>
            <div className="bg-[#FAF7F2] rounded-xl p-3">
              <p className="text-2xs text-[#2A2522]/40 mb-0.5">เช็คเอาท์</p>
              <p className="font-semibold text-[#2A2522] text-sm">{format(parseISO(r.check_out+'T00:00:00'), 'EEE d MMM', { locale: th })}</p>
              <p className="text-2xs text-[#2A2522]/40">ก่อน 12:00</p>
            </div>
          </div>

          {/* Amount */}
          <div className="flex justify-between items-center pt-3 border-t border-black/5">
            <span className="text-[#2A2522]/60 text-sm">ยอดรวม ({r.nights} คืน)</span>
            <span className="font-bold text-lg text-[#2A2522]">{formatCurrency(r.total_amount)}</span>
          </div>

          {/* Payment status */}
          {paymentMethod === 'at_hotel' ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
              💳 ชำระที่โรงแรม — จ่ายเมื่อเช็คอิน
            </div>
          ) : r.payment_status === 'paid' ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-sm text-emerald-700">
              ✅ ชำระเงินเรียบร้อย
            </div>
          ) : null}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link href={`/portal/bookings/qr?code=${r.reservation_code}`} className="flex-1">
          <LuxuryButton variant="secondary" fullWidth>
            <QrCode className="h-4 w-4" /> QR Check-in
          </LuxuryButton>
        </Link>
        <Link href="/portal/bookings" className="flex-1">
          <LuxuryButton variant="outline" fullWidth>
            My Bookings
          </LuxuryButton>
        </Link>
      </div>

      {hotel?.phone && (
        <p className="text-center text-xs text-[#2A2522]/40 mt-4">
          ติดต่อโรงแรม: <a href={`tel:${hotel.phone}`} className="text-[#C66A30]">{hotel.phone}</a>
        </p>
      )}
    </div>
  );
}
