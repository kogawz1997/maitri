'use client';
import { useState } from 'react';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Tag, Copy, ToggleLeft, ToggleRight, Trash2, CheckCircle } from 'lucide-react';

const TYPES = [{ v: 'percent', l: 'ส่วนลด %' }, { v: 'fixed', l: 'ส่วนลด ฿ คงที่' }, { v: 'free_night', l: 'คืนฟรี' }];

export function PromosClient({ hotelId, promos: init }: { hotelId: string; promos: any[] }) {
  const [promos, setPromos] = useState(init);
  const [show, setShow]     = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm]     = useState({ code: '', description: '', discountType: 'percent', discountValue: '', minAmount: '', validFrom: '', validUntil: '', maxUses: '' });

  function randomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  }

  async function save() {
    if (!form.code || !form.discountValue) { toast.error('กรอกโค้ดและส่วนลด'); return; }
    setSaving(true);
    const res = await fetch('/api/promotions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId, ...form, discountValue: Number(form.discountValue), minAmount: Number(form.minAmount || 0), maxUses: form.maxUses ? Number(form.maxUses) : null }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { toast.error(data.error); return; }
    setPromos(p => [data.promo, ...p]);
    setShow(false);
    setForm({ code: '', description: '', discountType: 'percent', discountValue: '', minAmount: '', validFrom: '', validUntil: '', maxUses: '' });
    toast.success('สร้างโค้ดแล้ว');
  }

  async function toggle(id: string, active: boolean) {
    await fetch('/api/promotions', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, hotelId, active: !active }) });
    setPromos(p => p.map(pr => pr.id === id ? { ...pr, active: !active } : pr));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
    toast.success('คัดลอกแล้ว!');
  }

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <TopBar title="โค้ดส่วนลด" description="สร้างและจัดการ Promo Codes สำหรับแขก"
        action={<Button size="sm" onClick={() => setShow(true)}><Plus className="h-3.5 w-3.5" /> สร้างโค้ด</Button>}
      />

      {promos.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">ยังไม่มีโค้ดส่วนลด</p>
          <p className="text-sm mt-1">สร้างโค้ดเพื่อดึงดูดแขกใหม่และรักษาแขกเก่า</p>
        </div>
      ) : (
        <div className="space-y-3">
          {promos.map(pr => {
            const expired = pr.valid_until && pr.valid_until < new Date().toISOString().slice(0, 10);
            const full    = pr.max_uses && pr.used_count >= pr.max_uses;
            return (
              <Card key={pr.id} className={cn(!pr.active || expired || full ? 'opacity-60' : '')}>
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="h-10 w-10 bg-accent/10 rounded-xl flex items-center justify-center shrink-0">
                    <Tag className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => copyCode(pr.code)}
                        className="font-mono font-bold text-base tracking-wider flex items-center gap-1 hover:text-accent transition-colors">
                        {pr.code}
                        {copied === pr.code ? <CheckCircle className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 opacity-40" />}
                      </button>
                      <span className={cn('text-2xs px-2 py-0.5 rounded-full font-medium', pr.active && !expired && !full ? 'bg-emerald-100 text-emerald-700' : 'bg-secondary text-muted-foreground')}>
                        {expired ? 'หมดอายุ' : full ? 'ใช้ครบแล้ว' : pr.active ? 'ใช้งานได้' : 'ปิด'}
                      </span>
                    </div>
                    {pr.description && <p className="text-xs text-muted-foreground">{pr.description}</p>}
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-0.5">
                      <span>ส่วนลด {pr.discount_type === 'percent' ? `${pr.discount_value}%` : formatCurrency(pr.discount_value)}</span>
                      {pr.valid_until && <span>ถึง {pr.valid_until}</span>}
                      {pr.max_uses && <span>ใช้แล้ว {pr.used_count}/{pr.max_uses} ครั้ง</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggle(pr.id, pr.active)}>
                      {pr.active ? <ToggleRight className="h-6 w-6 text-emerald-500" /> : <ToggleLeft className="h-6 w-6 text-muted-foreground" />}
                    </button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={show} onOpenChange={o => !o && setShow(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>สร้างโค้ดส่วนลด</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">โค้ด *</label>
              <div className="flex gap-2">
                <input value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER20" className="flex-1 px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring" />
                <Button variant="outline" size="sm" onClick={() => setForm(p => ({ ...p, code: randomCode() }))}>สุ่ม</Button>
              </div>
            </div>
            <F label="คำอธิบาย" value={form.description} onChange={(v: string) => setForm(p => ({ ...p, description: v }))} placeholder="ส่วนลดพิเศษฤดูร้อน" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">ประเภท</label>
                <select value={form.discountType} onChange={e => setForm(p => ({ ...p, discountType: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  {TYPES.map(t => <option key={t.v} value={t.v}>{t.l}</option>)}
                </select>
              </div>
              <F label={form.discountType === 'percent' ? 'ส่วนลด (%)' : 'ส่วนลด (฿)'} type="number"
                value={form.discountValue} onChange={(v: string) => setForm(p => ({ ...p, discountValue: v }))} placeholder={form.discountType === 'percent' ? '10' : '500'} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <F label="ยอดขั้นต่ำ (฿)" type="number" value={form.minAmount} onChange={(v: string) => setForm(p => ({ ...p, minAmount: v }))} placeholder="0" />
              <F label="จำกัดจำนวนครั้ง" type="number" value={form.maxUses} onChange={(v: string) => setForm(p => ({ ...p, maxUses: v }))} placeholder="ไม่จำกัด" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">วันเริ่ม</label>
                <input type="date" value={form.validFrom} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">วันหมดอายุ</label>
                <input type="date" value={form.validUntil} onChange={e => setForm(p => ({ ...p, validUntil: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShow(false)}>ยกเลิก</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'กำลังสร้าง...' : 'สร้างโค้ด'}</Button>
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
