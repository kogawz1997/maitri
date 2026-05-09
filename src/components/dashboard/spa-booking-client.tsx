'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { CalendarClock } from 'lucide-react';

type Reservation = { id: string; reservation_code: string; guests?: any; rooms?: any };
type Service = { id: string; name: string; price: number; duration_min: number };
type Therapist = { id: string; name: string };

export function SpaBookingClient({ reservations }: { reservations: Reservation[] }) {
  const [services, setServices] = useState<Service[]>([]);
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [reservationId, setReservationId] = useState(reservations[0]?.id || '');
  const [serviceId, setServiceId] = useState('');
  const [therapistId, setTherapistId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [newService, setNewService] = useState({ name: '', durationMin: '60', price: '' });
  const [loading, setLoading] = useState(false);

  async function load() {
    const [servicesRes, bookingsRes] = await Promise.all([fetch('/api/spa/services'), fetch('/api/spa/bookings')]);
    const servicesJson = await servicesRes.json();
    const bookingsJson = await bookingsRes.json();
    setServices(servicesJson.services || []);
    setTherapists(servicesJson.therapists || []);
    setBookings(Array.isArray(bookingsJson) ? bookingsJson : []);
    if (!serviceId && servicesJson.services?.[0]) setServiceId(servicesJson.services[0].id);
  }

  useEffect(() => { load(); }, []);

  async function createService() {
    setLoading(true);
    try {
      const res = await fetch('/api/spa/services', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newService.name, durationMin: Number(newService.durationMin), price: Number(newService.price) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Create service failed');
      setNewService({ name: '', durationMin: '60', price: '' });
      await load();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  }

  async function book() {
    if (!serviceId || !startTime) return alert('เลือก service และเวลา');
    setLoading(true);
    try {
      const res = await fetch('/api/spa/bookings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId: reservationId || null, serviceId, therapistId: therapistId || null, startTime: new Date(startTime).toISOString() }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Create booking failed');
      await load();
    } catch (error: any) { alert(error.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>จองสปา</CardTitle><CardDescription>มี validation กัน therapist เวลาชน ไม่ใช่จองทับกันแล้วไปวัดดวงหน้าเคาน์เตอร์</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <Select label="Reservation / Guest" value={reservationId} onChange={e => setReservationId(e.target.value)}>
              <option value="">Walk-in / ไม่ผูกห้อง</option>
              {reservations.map((r: any) => <option key={r.id} value={r.id}>{r.reservation_code} · {r.guests?.first_name || ''} {r.guests?.last_name || ''} · ห้อง {r.rooms?.room_number || '-'}</option>)}
            </Select>
            <Select label="Service" value={serviceId} onChange={e => setServiceId(e.target.value)}>
              {services.map(s => <option key={s.id} value={s.id}>{s.name} · {s.duration_min} นาที · {formatCurrency(Number(s.price))}</option>)}
            </Select>
            <Select label="Therapist" value={therapistId} onChange={e => setTherapistId(e.target.value)}>
              <option value="">ไม่ระบุ</option>
              {therapists.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </Select>
            <Input label="Start time" type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} />
            <Button disabled={loading || !services.length} onClick={book}>สร้าง Booking</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>เพิ่ม Service ด่วน</CardTitle><CardDescription>สำหรับโรงแรมที่ยังไม่ได้ seed เมนูสปา</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            <Input label="ชื่อ Service" value={newService.name} onChange={e => setNewService(v => ({ ...v, name: e.target.value }))} />
            <Input label="Duration minutes" type="number" value={newService.durationMin} onChange={e => setNewService(v => ({ ...v, durationMin: e.target.value }))} />
            <Input label="ราคา" type="number" value={newService.price} onChange={e => setNewService(v => ({ ...v, price: e.target.value }))} />
            <Button variant="outline" disabled={loading} onClick={createService}>เพิ่ม Service</Button>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle>Upcoming spa bookings</CardTitle><CardDescription>ตาราง 14 วันถัดไป</CardDescription></CardHeader>
        <CardContent className="space-y-3">
          {bookings.length === 0 ? <EmptyState icon={CalendarClock} title="ยังไม่มี booking" description="สร้างการจองสปาใหม่ แล้วระบบจะแสดงคิวนัดหมายที่นี่" className="py-10" /> : null}
          {bookings.map(b => (
            <div key={b.id} className="rounded-xl border p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-medium">{b.spa_services?.name || 'Spa service'}</div>
                <div className="text-xs text-muted-foreground">{new Date(b.start_time).toLocaleString()} → {new Date(b.end_time).toLocaleTimeString()} · {b.spa_therapists?.name || 'ไม่ระบุ therapist'}</div>
              </div>
              <div className="flex items-center gap-2"><Badge variant="outline">{b.status}</Badge><b>{formatCurrency(Number(b.amount || 0))}</b></div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
