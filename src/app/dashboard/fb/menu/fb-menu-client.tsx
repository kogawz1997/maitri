'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UtensilsCrossed, ToggleLeft, ToggleRight } from 'lucide-react';

const TAGS = ['vegan', 'spicy', 'gluten_free', 'halal', 'signature', 'popular', 'new'];

export function FBMenuClient({ hotelId, outlets, categories: initCats }: { hotelId: string; outlets: any[]; categories: any[] }) {
  const supabase = createClient();
  const [cats, setCats] = useState(initCats);
  const [activeOutlet, setActiveOutlet] = useState(outlets[0]?.id || '');
  const [showItem, setShowItem] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', categoryId: '', available: true, tags: [] as string[] });
  const [saving, setSaving] = useState(false);

  const outletCats = cats.filter(c => c.outlet_id === activeOutlet);
  const allItems   = outletCats.flatMap(c => c.fb_menu_items || []);

  async function saveItem() {
    if (!form.name || !form.price) { toast.error('กรอกชื่อและราคา'); return; }
    setSaving(true);
    const payload = { outlet_id: activeOutlet, category_id: form.categoryId || null, name: form.name, description: form.description, price: Number(form.price), available: form.available, tags: form.tags };
    let error;
    if (editItem) {
      ({ error } = await supabase.from('fb_menu_items').update(payload).eq('id', editItem.id));
    } else {
      ({ error } = await supabase.from('fb_menu_items').insert(payload));
    }
    setSaving(false);
    if (error) { toast.error('บันทึกไม่สำเร็จ'); return; }
    toast.success(editItem ? 'แก้ไขเมนูแล้ว' : 'เพิ่มเมนูแล้ว');
    setShowItem(false); setEditItem(null);
    window.location.reload();
  }

  async function toggleAvailable(id: string, current: boolean) {
    await supabase.from('fb_menu_items').update({ available: !current }).eq('id', id);
    setCats(p => p.map(c => ({ ...c, fb_menu_items: (c.fb_menu_items || []).map((i: any) => i.id === id ? { ...i, available: !current } : i) })));
  }

  async function deleteItem(id: string) {
    await supabase.from('fb_menu_items').delete().eq('id', id);
    setCats(p => p.map(c => ({ ...c, fb_menu_items: (c.fb_menu_items || []).filter((i: any) => i.id !== id) })));
    toast.success('ลบเมนูแล้ว');
  }

  return (
    <div className="container max-w-5xl py-8 animate-fade-in">
      <TopBar title="จัดการเมนู F&B" description="เมนูอาหาร เครื่องดื่ม และ Room Service"
        action={<Button size="sm" onClick={() => { setEditItem(null); setForm({ name: '', description: '', price: '', categoryId: outletCats[0]?.id || '', available: true, tags: [] }); setShowItem(true); }}><Plus className="h-3.5 w-3.5" /> เพิ่มเมนู</Button>}
      />

      {outlets.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <UtensilsCrossed className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">ยังไม่มี Outlet</p>
          <p className="text-sm mt-1">เพิ่ม Outlet (ร้านอาหาร, บาร์) ใน System Settings ก่อน</p>
        </div>
      ) : (
        <>
          {/* Outlet tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {outlets.map(o => (
              <button key={o.id} onClick={() => setActiveOutlet(o.id)}
                className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors', activeOutlet === o.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
                {o.name} <span className="ml-1 text-xs opacity-60">{o.type}</span>
              </button>
            ))}
          </div>

          {/* Menu items */}
          {outletCats.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">ยังไม่มีเมนู — กดเพิ่มเมนูด้านบน</div>
          ) : (
            <div className="space-y-6">
              {outletCats.map(cat => (
                <div key={cat.id}>
                  <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">{cat.name}</h3>
                  <div className="grid gap-3">
                    {(cat.fb_menu_items || []).map((item: any) => (
                      <Card key={item.id} className={cn(!item.available && 'opacity-50')}>
                        <CardContent className="p-4 flex items-center gap-4">
                          {item.image_url && <img src={item.image_url} alt={item.name} className="h-14 w-14 object-cover rounded-lg shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{item.name}</span>
                              {(item.tags || []).map((t: string) => (
                                <span key={t} className="text-2xs bg-secondary px-1.5 py-0.5 rounded-full">{t}</span>
                              ))}
                            </div>
                            {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-medium ticker">{formatCurrency(item.price)}</div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => toggleAvailable(item.id, item.available)} className="p-1.5 hover:bg-secondary rounded-lg transition-colors">
                              {item.available ? <ToggleRight className="h-4 w-4 text-emerald-500" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                            </button>
                            <button onClick={() => { setEditItem(item); setForm({ name: item.name, description: item.description || '', price: String(item.price), categoryId: item.category_id || '', available: item.available, tags: item.tags || [] }); setShowItem(true); }}
                              className="p-1.5 hover:bg-secondary rounded-lg transition-colors"><Pencil className="h-4 w-4" /></button>
                            <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-red-50 text-destructive rounded-lg transition-colors"><Trash2 className="h-4 w-4" /></button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit dialog */}
      <Dialog open={showItem} onOpenChange={o => !o && setShowItem(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editItem ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {outletCats.length > 0 && (
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">หมวดหมู่</label>
                <select value={form.categoryId} onChange={e => setForm(p => ({ ...p, categoryId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  <option value="">ไม่ระบุ</option>
                  {outletCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            <F label="ชื่อเมนู *" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} placeholder="เช่น ข้าวผัดกุ้ง" />
            <F label="คำอธิบาย" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} placeholder="วัตถุดิบ, วิธีปรุง" />
            <F label="ราคา (บาท) *" type="number" value={form.price} onChange={v => setForm(p => ({ ...p, price: v }))} placeholder="150" />
            <div>
              <label className="text-xs text-muted-foreground mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {TAGS.map(t => (
                  <button key={t} type="button" onClick={() => setForm(p => ({ ...p, tags: p.tags.includes(t) ? p.tags.filter(x => x !== t) : [...p.tags, t] }))}
                    className={cn('px-2.5 py-1 text-xs rounded-full border transition-all', form.tags.includes(t) ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItem(false)}>ยกเลิก</Button>
            <Button onClick={saveItem} disabled={saving}>{saving ? 'กำลังบันทึก...' : 'บันทึก'}</Button>
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
