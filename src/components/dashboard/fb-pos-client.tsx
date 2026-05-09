'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';
import { UtensilsCrossed } from 'lucide-react';

type MenuItem = { id: string; name: string; price: number; outlet_id: string };
type Reservation = { id: string; reservation_code: string; guests?: any; rooms?: any };
type Order = { id: string; order_number: string; status: string; total: number; payment_method?: string; reservations?: any; fb_order_items?: any[]; created_at: string };

export function FBPosClient({ reservations }: { reservations: Reservation[] }) {
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservationId, setReservationId] = useState(reservations[0]?.id || '');
  const [menuItemId, setMenuItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [newItem, setNewItem] = useState({ name: '', price: '' });
  const [loading, setLoading] = useState(false);

  async function load() {
    const [menuRes, ordersRes] = await Promise.all([fetch('/api/fb/menu'), fetch('/api/fb/orders')]);
    const menuJson = await menuRes.json();
    const ordersJson = await ordersRes.json();
    setMenu(menuJson.items || []);
    setOrders(Array.isArray(ordersJson) ? ordersJson : []);
    if (!menuItemId && menuJson.items?.[0]) setMenuItemId(menuJson.items[0].id);
  }

  useEffect(() => { load(); }, []);

  const selected = useMemo(() => menu.find(item => item.id === menuItemId), [menu, menuItemId]);
  const totalPreview = selected ? Number(selected.price) * quantity * 1.177 : 0;

  async function addMenuItem() {
    if (!newItem.name || !newItem.price) return;
    setLoading(true);
    try {
      const res = await fetch('/api/fb/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newItem.name, price: Number(newItem.price) }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Create menu failed');
      setNewItem({ name: '', price: '' });
      await load();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function createOrder() {
    if (!reservationId || !menuItemId) return alert('เลือก reservation และ menu ก่อน');
    setLoading(true);
    try {
      const res = await fetch('/api/fb/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId, items: [{ menuItemId, quantity }] }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Create order failed');
      await load();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function updateOrder(id: string, status: string) {
    setLoading(true);
    try {
      const res = await fetch('/api/fb/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, paymentMethod: 'room_charge' }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Update order failed');
      await load();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.2fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>สร้าง Room Service Order</CardTitle>
            <CardDescription>เลือก reservation แล้ว charge เข้า folio ได้ทันที</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select label="Reservation" value={reservationId} onChange={e => setReservationId(e.target.value)}>
              {reservations.map((r: any) => (
                <option key={r.id} value={r.id}>{r.reservation_code} · {r.guests?.first_name || ''} {r.guests?.last_name || ''} · ห้อง {r.rooms?.room_number || '-'}</option>
              ))}
            </Select>
            <Select label="Menu item" value={menuItemId} onChange={e => setMenuItemId(e.target.value)}>
              {menu.map(item => <option key={item.id} value={item.id}>{item.name} · {formatCurrency(Number(item.price))}</option>)}
            </Select>
            <Input label="Quantity" type="number" min={1} value={quantity} onChange={e => setQuantity(Number(e.target.value || 1))} />
            <div className="rounded-xl border bg-secondary/30 p-3 text-sm">
              Preview total รวม service+VAT ประมาณ <b>{formatCurrency(totalPreview)}</b>
            </div>
            <Button disabled={loading || !reservations.length || !menu.length} onClick={createOrder}>สร้าง Order</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>เพิ่มเมนูด่วน</CardTitle>
            <CardDescription>ไว้ seed เมนูแรกแบบไม่ต้องไปเปิด SQL เหมือนพิธีกรรมโบราณ</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input label="ชื่อเมนู" value={newItem.name} onChange={e => setNewItem(v => ({ ...v, name: e.target.value }))} />
            <Input label="ราคา" type="number" min={0} value={newItem.price} onChange={e => setNewItem(v => ({ ...v, price: e.target.value }))} />
            <Button variant="outline" disabled={loading} onClick={addMenuItem}>เพิ่มเมนู</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kitchen / Room Charge Queue</CardTitle>
          <CardDescription>ลำดับงานจากเปิดบิล → ทำอาหาร → เสิร์ฟ → charge เข้า folio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.length === 0 ? <EmptyState icon={UtensilsCrossed} title="ยังไม่มี order" description="เมื่อสร้าง room service order ใหม่ รายการคิวครัวจะปรากฏที่นี่" className="py-10" /> : null}
          {orders.map(order => (
            <div key={order.id} className="rounded-xl border p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-medium">{order.order_number}</div>
                  <div className="text-xs text-muted-foreground">
                    {order.reservations?.reservation_code || '-'} · ห้อง {order.reservations?.rooms?.room_number || '-'} · {order.reservations?.guests?.first_name || ''} {order.reservations?.guests?.last_name || ''}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={order.status === 'paid' ? 'success' : order.status === 'cancelled' ? 'destructive' : 'outline'}>{order.status}</Badge>
                  <b>{formatCurrency(Number(order.total || 0))}</b>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {(order.fb_order_items || []).map((line: any) => `${line.quantity}x ${line.fb_menu_items?.name || 'item'}`).join(', ')}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={loading || order.status === 'paid'} onClick={() => updateOrder(order.id, 'preparing')}>Preparing</Button>
                <Button size="sm" variant="outline" disabled={loading || order.status === 'paid'} onClick={() => updateOrder(order.id, 'served')}>Served</Button>
                <Button size="sm" disabled={loading || order.status === 'paid'} onClick={() => updateOrder(order.id, 'paid')}>Charge to folio</Button>
                <Button size="sm" variant="destructive" disabled={loading || order.status === 'paid'} onClick={() => updateOrder(order.id, 'cancelled')}>Cancel</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
