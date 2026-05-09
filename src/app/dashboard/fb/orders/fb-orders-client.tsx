'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, ChefHat, Clock, CheckCheck, Receipt, Minus } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const STATUS_CONFIG: Record<string, { label: string; color: string; next: string | null }> = {
  open:      { label: 'รับออร์เดอร์',  color: 'bg-sky-100 text-sky-700',     next: 'preparing' },
  preparing: { label: 'กำลังปรุง',     color: 'bg-amber-100 text-amber-700', next: 'served' },
  served:    { label: 'เสิร์ฟแล้ว',    color: 'bg-emerald-100 text-emerald-700', next: 'paid' },
  paid:      { label: 'ชำระแล้ว',      color: 'bg-secondary text-muted-foreground', next: null },
  cancelled: { label: 'ยกเลิก',        color: 'bg-red-100 text-red-600',     next: null },
};

export function FBOrdersClient({ hotelId, orders: init, outlets, menuItems, activeReservations }: any) {
  const supabase = createClient();
  const [orders, setOrders] = useState(init);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ outletId: outlets[0]?.id || '', tableNumber: '', reservationId: '', items: [] as { menuItemId: string; qty: number; name: string; price: number }[] });
  const [saving, setSaving] = useState(false);

  async function updateStatus(orderId: string, status: string) {
    await supabase.from('fb_orders').update({ status }).eq('id', orderId);
    setOrders((p: any[]) => p.map(o => o.id === orderId ? { ...o, status } : o).filter(o => !['paid','cancelled'].includes(o.status)));
    toast.success(`เปลี่ยนสถานะเป็น ${STATUS_CONFIG[status]?.label}`);
  }

  function addItem(item: any) {
    setNewForm(p => {
      const existing = p.items.find(i => i.menuItemId === item.id);
      if (existing) return { ...p, items: p.items.map(i => i.menuItemId === item.id ? { ...i, qty: i.qty + 1 } : i) };
      return { ...p, items: [...p.items, { menuItemId: item.id, qty: 1, name: item.name, price: Number(item.price) }] };
    });
  }

  function adjustQty(menuItemId: string, delta: number) {
    setNewForm(p => ({
      ...p,
      items: p.items.map(i => i.menuItemId === menuItemId ? { ...i, qty: Math.max(0, i.qty + delta) } : i).filter(i => i.qty > 0),
    }));
  }

  const subtotal = newForm.items.reduce((s, i) => s + i.price * i.qty, 0);
  const vat = subtotal * 0.07;
  const total = subtotal + vat;

  async function createOrder() {
    if (!newForm.outletId || newForm.items.length === 0) { toast.error('เลือก outlet และเพิ่มเมนูก่อน'); return; }
    setSaving(true);
    const orderNum = `F${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const { data: order, error } = await supabase.from('fb_orders').insert({
      hotel_id: hotelId, outlet_id: newForm.outletId,
      reservation_id: newForm.reservationId || null,
      table_number: newForm.tableNumber || null,
      order_number: orderNum, status: 'open',
      subtotal, service_charge: 0, tax: vat, total,
    }).select().single();
    if (error || !order) { toast.error('สร้างออร์เดอร์ไม่สำเร็จ'); setSaving(false); return; }
    await supabase.from('fb_order_items').insert(
      newForm.items.map(i => ({ order_id: order.id, menu_item_id: i.menuItemId, quantity: i.qty, unit_price: i.price, subtotal: i.price * i.qty }))
    );
    setSaving(false);
    toast.success(`สร้างออร์เดอร์ ${orderNum} แล้ว`);
    setShowNew(false);
    setOrders((p: any[]) => [{ ...order, fb_outlets: outlets.find((o: any) => o.id === newForm.outletId), fb_order_items: [] }, ...p]);
    setNewForm({ outletId: outlets[0]?.id || '', tableNumber: '', reservationId: '', items: [] });
  }

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <TopBar title="ออร์เดอร์ F&B" description="Kitchen Order Tickets — รายการที่กำลังดำเนินการ"
        action={<Button size="sm" onClick={() => setShowNew(true)}><Plus className="h-3.5 w-3.5" /> สร้างออร์เดอร์</Button>}
      />

      {orders.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <ChefHat className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">ยังไม่มีออร์เดอร์</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((order: any) => {
            const st = STATUS_CONFIG[order.status] || STATUS_CONFIG.open;
            const items = order.fb_order_items || [];
            return (
              <Card key={order.id} className="overflow-hidden">
                <div className={cn('h-1', order.status === 'preparing' ? 'bg-amber-400' : order.status === 'served' ? 'bg-emerald-500' : 'bg-sky-400')} />
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-mono font-bold text-sm">{order.order_number}</div>
                      {order.table_number && <div className="text-xs text-muted-foreground">โต๊ะ {order.table_number}</div>}
                      {order.fb_outlets && <div className="text-xs text-muted-foreground">{order.fb_outlets.name}</div>}
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', st.color)}>{st.label}</span>
                  </div>
                  <div className="space-y-1 mb-3 text-sm">
                    {items.slice(0, 5).map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span className="text-muted-foreground">{item.quantity}× {item.fb_menu_items?.name || '-'}</span>
                        <span>{formatCurrency(item.subtotal)}</span>
                      </div>
                    ))}
                    {items.length > 5 && <div className="text-xs text-muted-foreground">+{items.length - 5} รายการ</div>}
                  </div>
                  <div className="flex justify-between font-medium border-t border-border pt-2 mb-3">
                    <span>รวม</span>
                    <span className="ticker">{formatCurrency(order.total)}</span>
                  </div>
                  {st.next && (
                    <Button size="sm" className="w-full" onClick={() => updateStatus(order.id, st.next!)}>
                      {st.next === 'preparing' ? <><ChefHat className="h-3.5 w-3.5" /> รับออร์เดอร์</> :
                       st.next === 'served'    ? <><CheckCheck className="h-3.5 w-3.5" /> เสิร์ฟแล้ว</> :
                                                 <><Receipt className="h-3.5 w-3.5" /> ชำระแล้ว</>}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New order dialog */}
      <Dialog open={showNew} onOpenChange={o => !o && setShowNew(false)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>สร้างออร์เดอร์ใหม่</DialogTitle></DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Left: order info */}
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">Outlet</label>
                <select value={newForm.outletId} onChange={e => setNewForm(p => ({ ...p, outletId: e.target.value }))}
                  className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                  {outlets.map((o: any) => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1.5 block">เลขโต๊ะ / ห้อง</label>
                <input value={newForm.tableNumber} onChange={e => setNewForm(p => ({ ...p, tableNumber: e.target.value }))}
                  placeholder="T1, ห้อง 101..." className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none" />
              </div>
              {activeReservations.length > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">ลิงก์กับการจอง (ไม่บังคับ)</label>
                  <select value={newForm.reservationId} onChange={e => setNewForm(p => ({ ...p, reservationId: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-secondary border-0 rounded-xl text-sm focus:outline-none">
                    <option value="">ไม่ระบุ</option>
                    {activeReservations.map((r: any) => <option key={r.id} value={r.id}>{r.reservation_code} · {(r.guests as any)?.first_name} · ห้อง {(r.rooms as any)?.room_number}</option>)}
                  </select>
                </div>
              )}

              {/* Order items */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">รายการออร์เดอร์ ({newForm.items.length})</p>
                {newForm.items.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs border-2 border-dashed border-border rounded-xl">เลือกเมนูจากรายการด้านขวา</div>
                ) : (
                  <div className="space-y-2">
                    {newForm.items.map(item => (
                      <div key={item.menuItemId} className="flex items-center gap-2 text-sm">
                        <span className="flex-1 truncate">{item.name}</span>
                        <div className="flex items-center gap-1">
                          <button onClick={() => adjustQty(item.menuItemId, -1)} className="p-1 hover:bg-secondary rounded"><Minus className="h-3 w-3" /></button>
                          <span className="w-5 text-center font-medium">{item.qty}</span>
                          <button onClick={() => adjustQty(item.menuItemId, 1)} className="p-1 hover:bg-secondary rounded"><Plus className="h-3 w-3" /></button>
                        </div>
                        <span className="text-muted-foreground w-16 text-right">{formatCurrency(item.price * item.qty)}</span>
                      </div>
                    ))}
                    <div className="border-t border-border pt-2 space-y-1 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>VAT 7%</span><span>{formatCurrency(vat)}</span></div>
                      <div className="flex justify-between font-bold"><span>รวม</span><span>{formatCurrency(total)}</span></div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: menu */}
            <div>
              <p className="text-xs text-muted-foreground mb-2">เมนู (คลิกเพื่อเพิ่ม)</p>
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {menuItems.map((item: any) => (
                  <button key={item.id} onClick={() => addItem(item)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-secondary transition-colors text-left">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{item.name}</div>
                      {item.fb_menu_categories && <div className="text-2xs text-muted-foreground">{(item.fb_menu_categories as any).name}</div>}
                    </div>
                    <span className="text-sm font-medium text-accent shrink-0">{formatCurrency(item.price)}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNew(false)}>ยกเลิก</Button>
            <Button onClick={createOrder} disabled={saving || newForm.items.length === 0}>{saving ? 'กำลังสร้าง...' : 'สร้างออร์เดอร์'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
