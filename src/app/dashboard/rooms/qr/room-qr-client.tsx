'use client';

import { useState, useEffect, useRef } from 'react';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { QrCode, Printer, Download, Eye } from 'lucide-react';

declare global {
  interface Window { QRCode: any; }
}

export function RoomQRClient({ hotel, rooms }: { hotel: any; rooms: any[] }) {
  const [selected, setSelected] = useState<string[]>([]);
  const [preview, setPreview]   = useState<string | null>(null);
  const appUrl = typeof window !== 'undefined' ? window.location.origin : '';

  // Load QRCode.js dynamically
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js';
    document.head.appendChild(script);
    return () => { document.head.removeChild(script); };
  }, []);

  function getRoomUrl(room: any) {
    return `${appUrl}/room/${hotel.slug}-${room.room_number}`;
  }

  function toggleAll() {
    setSelected(p => p.length === rooms.length ? [] : rooms.map(r => r.id));
  }

  function printQRs() {
    const printRooms = selected.length > 0 ? rooms.filter(r => selected.includes(r.id)) : rooms;
    const w = window.open('', '_blank');
    if (!w) return;

    const cards = printRooms.map(room => {
      const url = getRoomUrl(room);
      const rt  = room.room_types as any;
      return `
        <div class="card">
          <div class="hotel">${hotel.name}</div>
          <div class="room">ห้อง ${room.room_number}</div>
          ${rt?.name ? `<div class="type">${rt.name}</div>` : ''}
          <div id="qr-${room.room_number}" class="qr-box"></div>
          <div class="url">${url}</div>
          <div class="hint">Scan เพื่อสั่งบริการ</div>
        </div>`;
    }).join('');

    w.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"/>
<title>QR Codes — ${hotel.name}</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
  body { font-family: sans-serif; margin: 0; padding: 20px; background: #fff; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .card { border: 1px solid #eee; border-radius: 12px; padding: 20px; text-align: center; page-break-inside: avoid; }
  .hotel { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px; }
  .room  { font-size: 28px; font-weight: 700; color: #2A2522; margin: 4px 0; }
  .type  { font-size: 12px; color: #C66A30; margin-bottom: 12px; }
  .qr-box { display: flex; justify-content: center; margin: 12px 0; }
  .url   { font-size: 10px; color: #aaa; word-break: break-all; margin-top: 8px; }
  .hint  { font-size: 11px; color: #888; margin-top: 4px; }
  @media print {
    body { padding: 0; }
    button { display: none; }
    .card { border: 1px solid #ddd; }
  }
</style>
</head>
<body>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
  <h2 style="margin:0;font-size:18px;">${hotel.name} — QR Codes (${printRooms.length} ห้อง)</h2>
  <button onclick="window.print()" style="padding:8px 16px;background:#2A2522;color:#fff;border:0;border-radius:8px;cursor:pointer;">🖨️ Print</button>
</div>
<div class="grid">${cards}</div>
<script>
  const rooms = ${JSON.stringify(printRooms.map(r => ({ num: r.room_number, url: getRoomUrl(r) })))};
  rooms.forEach(r => {
    const el = document.getElementById('qr-' + r.num);
    if (el) new QRCode(el, { text: r.url, width: 120, height: 120, colorDark: '#2A2522', colorLight: '#fff' });
  });
</script>
</body></html>`);
    w.document.close();
  }

  const floors = [...new Set(rooms.map(r => r.floor))].sort();

  return (
    <div className="container max-w-4xl py-8 animate-fade-in">
      <TopBar
        title="QR Code ห้องพัก"
        description="พิมพ์ QR สำหรับติดในห้อง — แขก scan เพื่อ chat สั่งบริการ"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={toggleAll}>
              {selected.length === rooms.length ? 'ยกเลิกทั้งหมด' : 'เลือกทั้งหมด'}
            </Button>
            <Button size="sm" onClick={printQRs}>
              <Printer className="h-3.5 w-3.5" />
              Print {selected.length > 0 ? `(${selected.length})` : `ทั้งหมด (${rooms.length})`}
            </Button>
          </div>
        }
      />

      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6 text-sm text-amber-800 dark:text-amber-300">
        <p className="font-semibold mb-1">📌 วิธีใช้</p>
        <ol className="list-decimal list-inside space-y-1 text-xs">
          <li>เลือกห้องที่ต้องการ (หรือกด "เลือกทั้งหมด")</li>
          <li>กด Print → หน้าต่างใหม่จะเปิดพร้อม QR ทุกห้อง</li>
          <li>Print ออกมาและติดในห้องพัก (เช่น บนโต๊ะ, หัวเตียง, ประตู)</li>
          <li>แขก scan QR → เปิดหน้า chat กับโรงแรมทันที</li>
        </ol>
      </div>

      {rooms.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <QrCode className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>ยังไม่มีห้องพัก — เพิ่มห้องใน Room Management ก่อน</p>
        </div>
      ) : (
        <div className="space-y-6">
          {floors.map(floor => (
            <div key={floor}>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                ชั้น {floor}
              </h3>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {rooms.filter(r => r.floor === floor).map(room => {
                  const rt  = room.room_types as any;
                  const sel = selected.includes(room.id);
                  return (
                    <button
                      key={room.id}
                      onClick={() => setSelected(p => sel ? p.filter(id => id !== room.id) : [...p, room.id])}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${sel ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/40 bg-card'}`}
                    >
                      <QrCode className={`h-5 w-5 mx-auto mb-1 ${sel ? 'text-accent' : 'text-muted-foreground'}`} />
                      <div className="font-bold text-sm">{room.room_number}</div>
                      {rt && <div className="text-2xs text-muted-foreground truncate">{rt.name}</div>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-card rounded-2xl p-6 max-w-xs w-full text-center shadow-xl" onClick={e => e.stopPropagation()}>
            <p className="font-semibold mb-4">Preview QR</p>
            <div id="preview-qr" className="flex justify-center mb-4" />
            <p className="text-xs text-muted-foreground break-all">{preview}</p>
            <Button className="mt-4 w-full" onClick={() => setPreview(null)}>ปิด</Button>
          </div>
        </div>
      )}
    </div>
  );
}
