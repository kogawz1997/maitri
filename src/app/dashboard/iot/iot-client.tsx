'use client';

import { useState, useEffect } from 'react';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Zap, Thermometer, Wind, Lightbulb, Lock, Activity, RefreshCw, Settings } from 'lucide-react';
import { toast } from 'sonner';

const DEVICE_ICONS: Record<string, any> = {
  ac: Wind, light: Lightbulb, lock: Lock,
  sensor: Activity, thermostat: Thermometer,
};

const STATUS_COLOR: Record<string, string> = {
  online: 'text-emerald-500',
  offline: 'text-muted-foreground',
  error: 'text-red-500',
};

export function IoTClient({ hotelId, initialDevices }: { hotelId: string; initialDevices: any[] }) {
  const [devices, setDevices] = useState(initialDevices);
  const [loading, setLoading] = useState(false);
  const isConfigured = !!(process.env.NEXT_PUBLIC_IOT_ENABLED === 'true');

  async function refresh() {
    setLoading(true);
    const res = await fetch(`/api/iot?hotelId=${hotelId}`);
    const data = await res.json();
    setDevices(data.devices || []);
    setLoading(false);
  }

  async function sendCommand(deviceId: string, command: string, value: any) {
    const res = await fetch('/api/iot', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId, deviceId, command, value }),
    });
    const data = await res.json();
    if (data.success) toast.success('ส่งคำสั่งแล้ว');
    else toast.info(data.message || 'Vendor API ยังไม่ได้ตั้งค่า');
  }

  const onlineCount  = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const acDevices    = devices.filter(d => d.device_type === 'ac');

  return (
    <div className="container max-w-5xl py-8 animate-fade-in">
      <TopBar title="IoT Energy Management" description="ควบคุมอุปกรณ์และประหยัดพลังงาน"
        action={
          <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
          </Button>
        }
      />

      {/* Setup notice if no vendor configured */}
      {!isConfigured && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <Settings className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">ต้องตั้งค่า IoT Vendor ก่อน</p>
              <div className="text-xs text-amber-700 dark:text-amber-400 mt-2 space-y-1">
                <p>เพิ่ม ENV vars ต่อไปนี้ใน Vercel:</p>
                <code className="block bg-amber-100 dark:bg-amber-900/50 p-2 rounded text-amber-800 dark:text-amber-300 font-mono">
                  IOT_VENDOR_API_URL=https://openapi.tuyaeu.com{'\n'}
                  IOT_VENDOR_API_KEY=your_access_id{'\n'}
                  IOT_WEBHOOK_SECRET=random_secret{'\n'}
                  NEXT_PUBLIC_IOT_ENABLED=true
                </code>
                <p className="mt-2">รองรับ: <strong>Tuya Smart</strong> (แนะนำสำหรับไทย), Schneider EcoStruxure, Delta Controls, KNX</p>
                <p>Webhook URL: <code className="bg-amber-100 dark:bg-amber-900/50 px-1 rounded">https://yourdomain.com/api/iot</code></p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Activity, label: 'อุปกรณ์ทั้งหมด', value: devices.length, color: 'text-foreground' },
          { icon: Zap,      label: 'ออนไลน์',        value: onlineCount,   color: 'text-emerald-500' },
          { icon: Wind,     label: 'แอร์ทั้งหมด',    value: acDevices.length, color: 'text-sky-500' },
          { icon: Zap,      label: 'ออฟไลน์',        value: offlineCount,  color: 'text-red-400' },
        ].map(s => {
          const Icon = s.icon;
          return (
            <Card key={s.label}><CardContent className="p-4">
              <Icon className={cn('h-5 w-5 mb-2', s.color)} />
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent></Card>
          );
        })}
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Zap className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">ยังไม่มีอุปกรณ์ IoT</p>
          <p className="text-sm mt-1">อุปกรณ์จะปรากฏที่นี่เมื่อ push readings มาที่ webhook</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {devices.map((device: any) => {
            const Icon = DEVICE_ICONS[device.device_type] || Zap;
            const room = device.rooms as any;
            const readings = device.latestReadings || [];
            return (
              <Card key={device.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{device.name || `${device.device_type} ${device.device_id.slice(-4)}`}</CardTitle>
                        {room && <p className="text-2xs text-muted-foreground">ห้อง {room.room_number}</p>}
                      </div>
                    </div>
                    <span className={cn('text-2xs font-medium flex items-center gap-1', STATUS_COLOR[device.status] || '')}>
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {device.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {readings.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {readings.slice(0, 4).map((r: any) => (
                        <div key={r.metric} className="bg-secondary rounded-lg px-2.5 py-1 text-xs">
                          <span className="text-muted-foreground">{r.metric}: </span>
                          <span className="font-medium">{r.value}{r.unit || ''}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {device.device_type === 'ac' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs"
                        onClick={() => sendCommand(device.device_id, 'switch', false)}>
                        ปิดแอร์
                      </Button>
                      <Button size="sm" className="flex-1 text-xs"
                        onClick={() => sendCommand(device.device_id, 'switch', true)}>
                        เปิดแอร์
                      </Button>
                    </div>
                  )}
                  {device.device_type === 'light' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs"
                        onClick={() => sendCommand(device.device_id, 'switch_led', false)}>ปิดไฟ</Button>
                      <Button size="sm" className="flex-1 text-xs"
                        onClick={() => sendCommand(device.device_id, 'switch_led', true)}>เปิดไฟ</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
