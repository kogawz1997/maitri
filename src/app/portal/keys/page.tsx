'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Smartphone, Wifi, ArrowLeft, CheckCircle2, Clock, Loader2, Key } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

function MobileKeyContent() {
  const searchParams = useSearchParams();
  const code = searchParams.get('code') || '';
  const [loading, setLoading] = useState(false);
  const [key, setKey]         = useState<any>(null);
  const [error, setError]     = useState('');

  async function requestKey() {
    if (!code) { setError('ไม่พบรหัสการจอง'); return; }
    setLoading(true);
    const res = await fetch('/api/mobile-key', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reservationCode: code }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error || 'เกิดข้อผิดพลาด'); return; }
    setKey(data.key);
  }

  async function openDoor() {
    if (!key?.token) return;
    // Web NFC API (Chrome Android)
    if ('NDEFReader' in window) {
      try {
        const ndef = new (window as any).NDEFReader();
        await ndef.write({
          records: [{ recordType: 'text', data: key.token }],
        });
        alert('แตะที่ประตู!');
      } catch {
        alert('NFC ไม่รองรับ ลองวิธี BLE');
      }
    } else {
      // Fallback: show token for manual entry or BLE
      alert(`Key Token:\n${key.token}\n\nแสดงให้ระบบ door lock สแกน`);
    }
  }

  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <Link href="/portal/bookings" className="flex items-center gap-2 text-[#2A2522]/50 text-sm mb-6 hover:text-[#2A2522] transition-colors">
          <ArrowLeft className="h-4 w-4" /> My Bookings
        </Link>

        <div className="bg-white rounded-2xl border border-black/5 shadow-sm overflow-hidden">
          <div className="bg-[#2A2522] p-6 text-center">
            <div className="h-16 w-16 bg-[#C66A30] rounded-2xl flex items-center justify-center mx-auto mb-3">
              <Key className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-white font-bold text-lg">Mobile Key</h1>
            <p className="text-white/50 text-sm mt-1">กุญแจดิจิทัลสำหรับห้องพัก</p>
          </div>

          <div className="p-6">
            {!key && !loading && (
              <>
                <div className="bg-[#FAF7F2] rounded-xl p-4 mb-5 space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-[#2A2522]/60"><Wifi className="h-4 w-4" />ใช้ NFC หรือ BLE unlock ประตู</div>
                  <div className="flex items-center gap-2 text-[#2A2522]/60"><Clock className="h-4 w-4" />ใช้ได้ตลอดช่วงเข้าพัก</div>
                  <div className="flex items-center gap-2 text-[#2A2522]/60"><CheckCircle2 className="h-4 w-4 text-emerald-500" />ปลอดภัย — ยืนยันตัวตนแล้ว</div>
                </div>
                {error && <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 mb-4">{error}</div>}
                <button onClick={requestKey} className="w-full py-3.5 bg-[#C66A30] text-white rounded-xl font-semibold hover:bg-[#A4522A] transition-colors">
                  ขอรับ Mobile Key
                </button>
              </>
            )}

            {loading && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-[#C66A30] mx-auto mb-3" />
                <p className="text-sm text-[#2A2522]/60">กำลังออก key...</p>
              </div>
            )}

            {key && (
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
                  <p className="font-semibold text-emerald-700">Key พร้อมใช้งาน!</p>
                  {key.vendorConnected
                    ? <p className="text-xs text-emerald-600 mt-1">เชื่อมต่อ door lock แล้ว</p>
                    : <p className="text-xs text-emerald-600 mt-1">{key.vendorMessage}</p>
                  }
                </div>

                <div className="bg-[#FAF7F2] rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#2A2522]/50">ห้อง</span>
                    <span className="font-bold">{key.roomNumber}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#2A2522]/50">ใช้ได้ถึง</span>
                    <span className="font-medium">{format(parseISO(key.validUntil), 'd MMM · HH:mm', { locale: th })}</span>
                  </div>
                </div>

                {key.vendorConnected && (
                  <button onClick={openDoor}
                    className="w-full py-4 bg-[#2A2522] text-white rounded-xl font-bold text-lg hover:bg-black transition-colors flex items-center justify-center gap-2">
                    <Smartphone className="h-5 w-5" /> แตะเปิดประตู (NFC)
                  </button>
                )}

                <p className="text-2xs text-[#2A2522]/30 text-center">Key จะหมดอายุอัตโนมัติเมื่อ Check-out</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MobileKeyPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin text-[#C66A30]" /></div>}>
      <MobileKeyContent />
    </Suspense>
  );
}
