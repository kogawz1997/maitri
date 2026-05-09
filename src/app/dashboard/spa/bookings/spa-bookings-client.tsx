'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO, addMinutes } from 'date-fns';
import { th } from 'date-fns/locale';
import { Plus, Clock, User, Heart, CheckCircle, XCircle } from 'lucide-react';

const STATUS_COLOR: Record<string, string> = {
  booked:    'bg-sky-100 text-sky-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  completed: 'bg-secondary text-muted-foreground',
  cancelled: 'bg-red-100 text-red-600',
  no_show:   'bg-red-100 text-red-600 opacity-60',
};

export function SpaBookingsClient({ hotelId, bookings: init, services, therapists, guests }: any) {
  const supabase = createClient();
  const [bookings, setBookings] = useState(init);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ serviceId: services[0]?.id || '', therapistId: '', guestId: '', startTime: '', notes: '' });
  const [saving, setSaving] = useState(false);

  const selectedSvc = services.find((s: any) => s.id === form.serviceId);

  async function saveBooking() {
    if (!form.serviceId || !form.startTime) { toast.error('เลือกบริการและวันเวลาก่อน'); return; }
    setSaving(true);
    const start = new Date(form.startTime);
    const end   = addMinutes(start, selectedSvc?.duration_min || 60);
    const { data, error } = await supabase.from('spa_bookings').insert({
      hotel_id: hotelId,
      service_id: form.serviceId,
      therapist_id: form.therapistId || null,
      guest_id: form.guestId || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      amount: selectedSvc?.price || 0,
      status: 'booked',
      notes: form.notes || null,
    }).select('*, spa_services(name,duration_min,price), spa_therapists(name), guests(first_name,last_name)').single();
    setSaving(false);
    if (error) { toast.error('จองไม่สำเร็จ'); return; }
    setBookings((p: any[]) => [...p, data].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
    setShowNew(false);
    setForm({ serviceId: services[0]?.id || '', therapistId: '', guestId: '', startTime: '', notes: '' });
    toast.success('บันทึกการนัดหมายแล้ว');
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('spa_bookings').update({ status }).eq('id', id);
    setBookings((p: any[]) => p.map(b => b.id === id ? { ...b, status } : b));
    toast.success('อัพเดตสถานะแล้ว');
  }

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <TopBar title="Spa Bookings" description="ปฏิทินนัดหมายบริการ Spa สัปดาห์นี้"
        action={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5" /> นัดหมายใหม่</Button>}
      />

      {bookings.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Heart className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">ไม่มีนัดหมายในสัปดาห์นี้</p>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b: any) => {
            const svc = b.spa_services as any;
            const thp = b.spa_therapists as any;
            const gst = b.guests as any;
            const startTime = parseISO(b.start_time);
            const endTime   = parseISO(b.end_time);
            return (
              <Card key={b.id}>
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-rose-100 flex items-center justify-center shrink-0">
                    <Heart className="h-6 w-6 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{svc?.name || 'บริการ'}</div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(startTime, 'EEE d MMM HH:mm', { locale: th })} — {format(endTime, 'HH:mm')}</span>
                      {thp && <span className="flex items-center gap-1"><User className="h-3 w-3" />{thp.name}</span>}
                      {gst && <span>👤 {gst.first_name} {gst.last_name || ''}</span>}
                    </div>
                    {b.notes && <p className="text-xs text-muted-foreground mt-0.5">{b.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', STATUS_COLOR[b.status] || STATUS_COLOR.booked)}>{b.status}</span>
                    <span className="font-medium text-sm ticker">{formatCurrency(b.amount)}</span>
                    {b.status === 'booked' && (
                      <div className="flex gap-1">
                        <button onClick={() => updateStatus(b.id, 'completed')} className="p-1 hover:text-emerald-600 transition-colors"><CheckCircle className="h-4 w-4" /></button>
                        <button onClick={() => updateStatus(b.id, 'cancelled')} className="p-1 hover:text-destructive transition-colors"><XCircle className="h-4 w-4" /></button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>นัดหมาย Spa ใหม่</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">บริการ *</label>
              <select value={form.serviceId} onChange={e => setForm(p => ({ ...p, serviceId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                {services.map((s: any) => <option key={s.id} value={s.id}>{s.name} ({s.duration_min} นาที · {formatCurrency(s.price)})</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">วันและเวลา *</label>
              <input type="datetime-local" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))}
                className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none" />
            </div>
            {therapists.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">นักบำบัด</label>
                <select value={form.therapistId} onChange={e => setForm(p => ({ ...p, therapistId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  <option value="">ไม่ระบุ</option>
                  {therapists.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            )}
            {guests.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">แขก</label>
                <select value={form.guestId} onChange={e => setForm(p => ({ ...p, guestId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  <option value="">ไม่ระบุ</option>
                  {guests.map((g: any) => <option key={g.id} value={g.id}>{g.first_name} {g.last_name || ''}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">หมายเหตุ</label>
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                placeholder="ความต้องการพิเศษ, อาการแพ้..." className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm resize-none focus:outline-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>ยกเลิก</Button>
            <Button onClick={saveBooking} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
