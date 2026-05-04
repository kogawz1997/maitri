'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, calculateNights } from '@/lib/utils';
import { Bed, Check, Users, Maximize2, MapPin, Phone, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export function BookingEngine({ hotel, roomTypes }: { hotel: any; roomTypes: any[] }) {
  const [step, setStep] = useState<'search' | 'select' | 'guest' | 'confirmed'>('search');
  const [search, setSearch] = useState({ checkIn: '', checkOut: '', adults: 2, children: 0 });
  const [selectedRoomType, setSelectedRoomType] = useState<any>(null);
  const [guest, setGuest] = useState({ firstName: '', lastName: '', email: '', phone: '', nationality: '' });
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const nights = search.checkIn && search.checkOut ? calculateNights(search.checkIn, search.checkOut) : 0;

  async function handleConfirmBooking() {
    setLoading(true);
    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hotelId: hotel.id,
          firstName: guest.firstName,
          lastName: guest.lastName,
          email: guest.email,
          phone: guest.phone,
          nationality: guest.nationality,
          checkIn: search.checkIn,
          checkOut: search.checkOut,
          roomTypeId: selectedRoomType.id,
          numAdults: search.adults,
          numChildren: search.children,
          totalAmount: selectedRoomType.base_rate * nights,
          source: 'website',
        }),
      });
      const data = await response.json();
      if (data.reservation) {
        setReservation(data.reservation);
        setStep('confirmed');
      }
    } catch {
      toast.error('ไม่สามารถสร้างการจองได้');
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-ivory">
      <header className="bg-card border-b border-border">
        <div className="container py-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight">{hotel.name}</h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
              {hotel.city && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {hotel.city}</span>}
              {hotel.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {hotel.phone}</span>}
            </div>
          </div>
          <span className="text-2xs text-muted-foreground">
            Powered by <span className="font-display font-medium">Maitri</span>
          </span>
        </div>
      </header>

      <div className="container py-12 max-w-3xl">
        <Stepper currentStep={step} />

        {step === 'search' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <p className="text-xs uppercase tracking-widest text-accent mb-2">จองห้องพัก</p>
              <h2 className="font-display text-4xl font-medium tracking-tight text-balance">
                ค้นหาห้องว่าง<br/>
                <span className="italic text-accent">เริ่มต้นทริปของคุณ</span>
              </h2>
            </div>
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input type="date" label="Check-in" value={search.checkIn} onChange={(e) => setSearch({ ...search, checkIn: e.target.value })} />
                  <Input type="date" label="Check-out" value={search.checkOut} onChange={(e) => setSearch({ ...search, checkOut: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input type="number" label="ผู้ใหญ่" min={1} value={search.adults} onChange={(e) => setSearch({ ...search, adults: Number(e.target.value) })} />
                  <Input type="number" label="เด็ก" min={0} value={search.children} onChange={(e) => setSearch({ ...search, children: Number(e.target.value) })} />
                </div>
                <Button size="lg" className="w-full group" onClick={() => setStep('select')} disabled={!search.checkIn || !search.checkOut}>
                  ค้นหาห้องว่าง <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'select' && (
          <div className="animate-fade-in">
            <button onClick={() => setStep('search')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" /> เปลี่ยนวันที่
            </button>
            <p className="text-sm text-muted-foreground mb-4">
              {search.checkIn} → {search.checkOut} · {nights} คืน · {search.adults} ผู้ใหญ่
              {search.children > 0 && ` · ${search.children} เด็ก`}
            </p>
            <div className="space-y-3">
              {roomTypes.map(rt => (
                <Card key={rt.id} className="hover:border-accent transition-colors">
                  <CardContent className="p-5 flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Bed className="h-4 w-4 text-muted-foreground" />
                        <h3 className="font-display text-xl font-medium">{rt.name}</h3>
                      </div>
                      {rt.description && <p className="text-sm text-muted-foreground mb-3">{rt.description}</p>}
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> รองรับ {rt.max_occupancy}</span>
                        {rt.size_sqm && <span className="flex items-center gap-1"><Maximize2 className="h-3 w-3" /> {rt.size_sqm} ตร.ม.</span>}
                        {rt.bed_type && <span>· {rt.bed_type}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-2xl font-medium ticker">{formatCurrency(rt.base_rate)}</div>
                      <div className="text-xs text-muted-foreground">/คืน</div>
                      <div className="text-sm font-medium mt-2">รวม {formatCurrency(rt.base_rate * nights)}</div>
                      <Button size="sm" className="mt-3" onClick={() => { setSelectedRoomType(rt); setStep('guest'); }}>
                        เลือก <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 'guest' && (
          <div className="animate-fade-in">
            <button onClick={() => setStep('select')} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" /> เลือกห้องอื่น
            </button>
            <Card>
              <CardContent className="p-6 space-y-4">
                <h2 className="font-display text-xl font-medium mb-2">ข้อมูลผู้เข้าพัก</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="ชื่อ" value={guest.firstName} onChange={(e) => setGuest({ ...guest, firstName: e.target.value })} required />
                  <Input label="นามสกุล" value={guest.lastName} onChange={(e) => setGuest({ ...guest, lastName: e.target.value })} required />
                </div>
                <Input type="email" label="อีเมล" value={guest.email} onChange={(e) => setGuest({ ...guest, email: e.target.value })} required />
                <Input label="เบอร์โทร" value={guest.phone} onChange={(e) => setGuest({ ...guest, phone: e.target.value })} required />
                <Input label="สัญชาติ" hint="สำหรับ ทร.30 (ถ้าเป็นชาวต่างชาติ)" value={guest.nationality} onChange={(e) => setGuest({ ...guest, nationality: e.target.value })} />

                <div className="bg-secondary/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{selectedRoomType?.name}</span>
                    <span>{formatCurrency(selectedRoomType?.base_rate)} × {nights}</span>
                  </div>
                  <div className="hairline" />
                  <div className="flex justify-between font-medium">
                    <span>รวมทั้งสิ้น</span>
                    <span className="font-display text-lg ticker">{formatCurrency(selectedRoomType?.base_rate * nights)}</span>
                  </div>
                </div>

                <Button size="lg" onClick={handleConfirmBooking} disabled={loading || !guest.firstName || !guest.email} className="w-full">
                  {loading ? 'กำลังจอง...' : 'ยืนยันการจอง'}
                </Button>
                <p className="text-2xs text-muted-foreground text-center">
                  ขั้นตอนชำระเงินจะถูกส่งทางอีเมลหลังยืนยัน
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {step === 'confirmed' && reservation && (
          <div className="animate-fade-in">
            <Card>
              <CardContent className="py-16 text-center">
                <div className="h-16 w-16 mx-auto mb-6 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="font-display text-3xl font-medium tracking-tight mb-2">จองสำเร็จ!</h2>
                <p className="text-sm text-muted-foreground mb-6">ยินดีต้อนรับสู่ {hotel.name}</p>
                <div className="inline-block bg-secondary px-6 py-3 rounded-lg mb-6">
                  <div className="text-2xs uppercase tracking-wider text-muted-foreground mb-1">รหัสการจอง</div>
                  <div className="font-mono text-xl font-medium">{reservation.reservation_code}</div>
                </div>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  เราได้ส่งรายละเอียดการจองและขั้นตอนชำระเงินไปที่ <span className="text-foreground">{guest.email}</span>
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

function Stepper({ currentStep }: { currentStep: string }) {
  const steps = ['search', 'select', 'guest', 'confirmed'];
  const currentIdx = steps.indexOf(currentStep);
  return (
    <div className="flex justify-center gap-2 mb-8">
      {steps.map((s, i) => (
        <div key={s} className={`h-1 w-12 rounded-full transition-colors ${i <= currentIdx ? 'bg-accent' : 'bg-secondary'}`} />
      ))}
    </div>
  );
}
