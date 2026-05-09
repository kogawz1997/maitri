'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock } from 'lucide-react';

const CATEGORIES = ['plumbing', 'electrical', 'ac', 'tv', 'internet', 'furniture', 'cleaning', 'elevator', 'other'];
const PRIORITIES  = [{ v: 'low', l: 'ต่ำ', c: 'bg-secondary text-muted-foreground' }, { v: 'normal', l: 'ปกติ', c: 'bg-sky-100 text-sky-700' }, { v: 'high', l: 'เร่งด่วน', c: 'bg-orange-100 text-orange-700' }, { v: 'urgent', l: '🚨 วิกฤต', c: 'bg-red-100 text-red-700' }];
const STATUS_CFG: Record<string, { l: string; c: string; icon: any }> = {
  pending:     { l: 'รอดำเนินการ',  c: 'bg-amber-100 text-amber-700', icon: Clock },
  in_progress: { l: 'กำลังซ่อม',   c: 'bg-sky-100 text-sky-700',     icon: Wrench },
  resolved:    { l: 'แก้ไขแล้ว',   c: 'bg-emerald-100 text-emerald-700', icon: CheckCircle },
  cancelled:   { l: 'ยกเลิก',      c: 'bg-secondary text-muted-foreground', icon: CheckCircle },
};

export function MaintenanceClient({ hotelId, userId, requests: init, rooms, staff }: any) {
  const supabase = createClient();
  const [requests, setRequests] = useState(init);
  const [activeFilter, setActiveFilter] = useState('pending');
  const [showNew, setShowNew] = useState(false);
  const [showResolve, setShowResolve] = useState<any>(null);
  const [form, setForm] = useState({ roomId: '', category: 'other', description: '', priority: 'normal' });
  const [resolveNote, setResolveNote] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = activeFilter === 'all' ? requests : requests.filter((r: any) => r.status === activeFilter);

  async function submit() {
    if (!form.description) { toast.error('กรอกรายละเอียดก่อน'); return; }
    setSaving(true);
    const { data, error } = await supabase.from('maintenance_requests').insert({
      hotel_id: hotelId, room_id: form.roomId || null,
      reported_by: userId, category: form.category,
      description: form.description, priority: form.priority, status: 'pending',
    }).select('*, rooms(room_number, floor)').single();
    setSaving(false);
    if (error) { toast.error('ส่งคำร้องไม่สำเร็จ'); return; }
    setRequests((p: any[]) => [data, ...p]);
    setShowNew(false);
    setForm({ roomId: '', category: 'other', description: '', priority: 'normal' });
    toast.success('ส่งคำร้องซ่อมแล้ว');
  }

  async function resolve() {
    if (!showResolve) return;
    setSaving(true);
    await supabase.from('maintenance_requests').update({ status: 'resolved', resolved_at: new Date().toISOString(), resolution_notes: resolveNote }).eq('id', showResolve.id);
    setRequests((p: any[]) => p.map(r => r.id === showResolve.id ? { ...r, status: 'resolved', resolution_notes: resolveNote } : r));
    setSaving(false);
    setShowResolve(null); setResolveNote('');
    toast.success('แก้ไขปัญหาเรียบร้อย');
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from('maintenance_requests').update({ status }).eq('id', id);
    setRequests((p: any[]) => p.map(r => r.id === id ? { ...r, status } : r));
    toast.success('อัพเดตสถานะแล้ว');
  }

  const counts = { pending: requests.filter((r: any) => r.status === 'pending').length, in_progress: requests.filter((r: any) => r.status === 'in_progress').length, resolved: requests.filter((r: any) => r.status === 'resolved').length };

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <TopBar title="Maintenance" description="คำร้องขอซ่อมและบำรุงรักษา"
        action={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5" /> แจ้งซ่อม</Button>}
      />

      {/* Status summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{ k: 'pending', l: 'รอดำเนินการ', icon: Clock, c: 'text-amber-600' }, { k: 'in_progress', l: 'กำลังซ่อม', icon: Wrench, c: 'text-sky-600' }, { k: 'resolved', l: 'แก้ไขแล้ว', icon: CheckCircle, c: 'text-emerald-600' }].map(s => (
          <button key={s.k} onClick={() => setActiveFilter(s.k)}
            className={cn('p-4 rounded-xl border text-left transition-all', activeFilter === s.k ? 'border-accent bg-accent/5' : 'border-border bg-card hover:bg-secondary/30')}>
            <s.icon className={cn('h-5 w-5 mb-2', s.c)} />
            <div className="text-2xl font-bold text-foreground">{(counts as any)[s.k]}</div>
            <div className="text-xs text-muted-foreground">{s.l}</div>
          </button>
        ))}
      </div>

      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'in_progress', 'resolved'].map(f => (
          <button key={f} onClick={() => setActiveFilter(f)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-colors', activeFilter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
            {f === 'all' ? 'ทั้งหมด' : STATUS_CFG[f]?.l || f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground"><Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" /><p>ไม่มีคำร้องในสถานะนี้</p></div>
        ) : filtered.map((r: any) => {
          const st = STATUS_CFG[r.status] || STATUS_CFG.pending;
          const pr = PRIORITIES.find(p => p.v === r.priority) || PRIORITIES[1];
          const Icon = st.icon;
          return (
            <Card key={r.id}>
              <CardContent className="p-4 flex flex-wrap items-start gap-4">
                <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center shrink-0', r.status === 'resolved' ? 'bg-emerald-100' : r.priority === 'urgent' ? 'bg-red-100' : 'bg-amber-100')}>
                  <Icon className={cn('h-5 w-5', r.status === 'resolved' ? 'text-emerald-600' : r.priority === 'urgent' ? 'text-red-600' : 'text-amber-600')} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    {r.rooms && <span className="font-medium text-sm">ห้อง {r.rooms.room_number}</span>}
                    <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">{r.category}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', pr.c)}>{pr.l}</span>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.c)}>{st.l}</span>
                  </div>
                  <p className="text-sm text-foreground">{r.description}</p>
                  {r.resolution_notes && <p className="text-xs text-muted-foreground mt-1">✓ {r.resolution_notes}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{format(parseISO(r.created_at), 'd MMM yyyy HH:mm', { locale: th })}</p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {r.status === 'pending' && <Button size="sm" variant="outline" onClick={() => updateStatus(r.id, 'in_progress')}>รับงาน</Button>}
                  {r.status === 'in_progress' && <Button size="sm" onClick={() => setShowResolve(r)}>แก้ไขแล้ว</Button>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* New request dialog */}
      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>แจ้งซ่อม / Maintenance Request</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">ห้อง (ถ้ามี)</label>
              <select value={form.roomId} onChange={e => setForm(p => ({ ...p, roomId: e.target.value }))}
                className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                <option value="">ไม่ระบุห้อง (พื้นที่ส่วนกลาง)</option>
                {rooms.map((r: any) => <option key={r.id} value={r.id}>ห้อง {r.room_number} (ชั้น {r.floor})</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">ประเภท</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">ความเร่งด่วน</label>
                <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  {PRIORITIES.map(p => <option key={p.v} value={p.v}>{p.l}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">รายละเอียดปัญหา *</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
                placeholder="อธิบายปัญหาที่พบโดยละเอียด..." className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>ยกเลิก</Button>
            <Button onClick={submit} disabled={saving}>{saving ? 'กำลังส่ง...' : 'ส่งคำร้อง'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve dialog */}
      <Dialog open={!!showResolve} onOpenChange={o => !o && setShowResolve(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>บันทึกการแก้ไข</DialogTitle></DialogHeader>
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">วิธีที่แก้ไข</label>
            <textarea value={resolveNote} onChange={e => setResolveNote(e.target.value)} rows={3}
              placeholder="อธิบายวิธีที่แก้ไขปัญหา..." className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm resize-none focus:outline-none" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResolve(null)}>ยกเลิก</Button>
            <Button onClick={resolve} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'ยืนยันแก้ไขแล้ว'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
