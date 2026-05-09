'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Heart, Clock, User } from 'lucide-react';

const CATEGORIES = ['massage', 'facial', 'body_treatment', 'nail', 'hair', 'meditation', 'other'];

export function SpaServicesClient({ hotelId, services: init, therapists: initT }: { hotelId: string; services: any[]; therapists: any[] }) {
  const supabase = createClient();
  const [services, setServices] = useState(init);
  const [therapists, setTherapists] = useState(initT);
  const [tab, setTab] = useState<'services' | 'therapists'>('services');
  const [showSvc, setShowSvc] = useState(false);
  const [showThp, setShowThp] = useState(false);
  const [editSvc, setEditSvc] = useState<any>(null);
  const [svcForm, setSvcForm] = useState({ name: '', description: '', duration_min: '60', price: '', category: 'massage', active: true });
  const [thpForm, setThpForm] = useState({ name: '', specialties: '' });
  const [saving, setSaving] = useState(false);

  async function saveSvc() {
    if (!svcForm.name || !svcForm.price) { toast.error('กรอกชื่อและราคา'); return; }
    setSaving(true);
    const payload = { hotel_id: hotelId, name: svcForm.name, description: svcForm.description, duration_min: Number(svcForm.duration_min), price: Number(svcForm.price), category: svcForm.category, active: svcForm.active };
    let error, data;
    if (editSvc) { ({ error, data } = await supabase.from('spa_services').update(payload).eq('id', editSvc.id).select().single()); }
    else          { ({ error, data } = await supabase.from('spa_services').insert(payload).select().single()); }
    setSaving(false);
    if (error) { toast.error('บันทึกไม่สำเร็จ'); return; }
    setServices(p => editSvc ? p.map(s => s.id === editSvc.id ? data : s) : [...p, data]);
    setShowSvc(false); setEditSvc(null);
    toast.success(editSvc ? 'แก้ไขบริการแล้ว' : 'เพิ่มบริการแล้ว');
  }

  async function saveTherapist() {
    if (!thpForm.name) { toast.error('กรอกชื่อ'); return; }
    setSaving(true);
    const specialties = thpForm.specialties.split(',').map(s => s.trim()).filter(Boolean);
    const { data, error } = await supabase.from('spa_therapists').insert({ hotel_id: hotelId, name: thpForm.name, specialties, active: true }).select().single();
    setSaving(false);
    if (error) { toast.error('บันทึกไม่สำเร็จ'); return; }
    setTherapists(p => [...p, data]);
    setShowThp(false); setThpForm({ name: '', specialties: '' });
    toast.success('เพิ่มนักบำบัดแล้ว');
  }

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <TopBar title="Spa Management" description="บริการ Spa และนักบำบัด"
        action={
          <Button size="sm" onClick={() => tab === 'services' ? setShowSvc(true) : setShowThp(true)}>
            <Plus className="h-3.5 w-3.5" /> {tab === 'services' ? 'เพิ่มบริการ' : 'เพิ่มนักบำบัด'}
          </Button>
        }
      />

      <div className="flex gap-1 mb-6">
        {[{ key: 'services', label: '🌸 บริการ' }, { key: 'therapists', label: '👩‍⚕️ นักบำบัด' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', tab === t.key ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'services' && (
        <div className="space-y-3">
          {services.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><Heart className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>ยังไม่มีบริการ</p></div>
          ) : services.map(s => (
            <Card key={s.id} className={cn(!s.active && 'opacity-50')}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-rose-100 flex items-center justify-center shrink-0"><Heart className="h-5 w-5 text-rose-500" /></div>
                <div className="flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium">{s.name}</span><span className="text-2xs bg-secondary px-2 py-0.5 rounded-full">{s.category}</span></div>
                  {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.duration_min} นาที</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium ticker">{formatCurrency(s.price)}</div>
                  <div className={`text-2xs ${s.active ? 'text-emerald-600' : 'text-muted-foreground'}`}>{s.active ? 'พร้อมให้บริการ' : 'ปิดชั่วคราว'}</div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditSvc(s); setSvcForm({ name: s.name, description: s.description || '', duration_min: String(s.duration_min), price: String(s.price), category: s.category || 'massage', active: s.active }); setShowSvc(true); }} className="p-1.5 hover:bg-secondary rounded-lg"><Pencil className="h-4 w-4" /></button>
                  <button onClick={async () => { await supabase.from('spa_services').delete().eq('id', s.id); setServices(p => p.filter(x => x.id !== s.id)); toast.success('ลบแล้ว'); }} className="p-1.5 hover:bg-red-50 text-destructive rounded-lg"><Trash2 className="h-4 w-4" /></button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {tab === 'therapists' && (
        <div className="space-y-3">
          {therapists.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground"><User className="h-12 w-12 mx-auto mb-3 opacity-30" /><p>ยังไม่มีนักบำบัด</p></div>
          ) : therapists.map(t => (
            <Card key={t.id}><CardContent className="p-4 flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">{t.name.charAt(0)}</div>
              <div className="flex-1">
                <div className="font-medium">{t.name}</div>
                {(t.specialties || []).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">{t.specialties.map((s: string) => <span key={s} className="text-2xs bg-secondary px-2 py-0.5 rounded-full">{s}</span>)}</div>
                )}
              </div>
              <button onClick={async () => { await supabase.from('spa_therapists').delete().eq('id', t.id); setTherapists(p => p.filter(x => x.id !== t.id)); toast.success('ลบแล้ว'); }} className="p-1.5 hover:bg-red-50 text-destructive rounded-lg"><Trash2 className="h-4 w-4" /></button>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Service dialog */}
      <Dialog open={showSvc} onOpenChange={o => !o && setShowSvc(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editSvc ? 'แก้ไขบริการ' : 'เพิ่มบริการ Spa'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <F label="ชื่อบริการ *" value={svcForm.name} onChange={(v: string) => setSvcForm(p => ({ ...p, name: v }))} placeholder="นวดแผนไทย, หน้าใส..." />
            <F label="คำอธิบาย" value={svcForm.description} onChange={(v: string) => setSvcForm(p => ({ ...p, description: v }))} placeholder="รายละเอียดบริการ" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">หมวดหมู่</label>
                <select value={svcForm.category} onChange={e => setSvcForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <F label="ระยะเวลา (นาที)" type="number" value={svcForm.duration_min} onChange={(v: string) => setSvcForm(p => ({ ...p, duration_min: v }))} placeholder="60" />
            </div>
            <F label="ราคา (บาท) *" type="number" value={svcForm.price} onChange={(v: string) => setSvcForm(p => ({ ...p, price: v }))} placeholder="1500" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSvc(false)}>ยกเลิก</Button>
            <Button onClick={saveSvc} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Therapist dialog */}
      <Dialog open={showThp} onOpenChange={o => !o && setShowThp(false)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>เพิ่มนักบำบัด</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <F label="ชื่อ-นามสกุล *" value={thpForm.name} onChange={(v: string) => setThpForm(p => ({ ...p, name: v }))} placeholder="นางสาวสมหญิง ดีดี" />
            <F label="ความเชี่ยวชาญ (คั่นด้วยจุลภาค)" value={thpForm.specialties} onChange={(v: string) => setThpForm(p => ({ ...p, specialties: v }))} placeholder="massage, facial, hot stone" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowThp(false)}>ยกเลิก</Button>
            <Button onClick={saveTherapist} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
function F({ label, value, onChange, type = 'text', placeholder }: any) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1.5 block">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
    </div>
  );
}
