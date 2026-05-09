'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TopBar } from '@/components/layout/top-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency, cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { TrendingUp, TrendingDown, Target, Sparkles, CalendarRange, BarChart3, Hotel, ArrowRight } from 'lucide-react';
import { format, eachDayOfInterval, subDays, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

export function RevenueManagerClient({ hotelId, metrics, reservations, roomTypes, rateCalendar, targets }: any) {
  const [view, setView] = useState<'overview' | 'forecast' | 'targets'>('overview');

  // Build daily revenue chart (last 30 days)
  const last30 = eachDayOfInterval({ start: subDays(new Date(), 29), end: new Date() });
  const dailyRevenue = last30.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayRes  = reservations.filter((r: any) => r.check_in === dateStr);
    return {
      date: format(day, 'd MMM', { locale: th }),
      revenue: dayRes.reduce((s: number, r: any) => s + Number(r.total_amount || 0), 0),
      bookings: dayRes.length,
    };
  });

  // Source breakdown
  const sourceMap: Record<string, number> = {};
  reservations.forEach((r: any) => {
    const src = r.source || 'direct';
    sourceMap[src] = (sourceMap[src] || 0) + Number(r.total_amount || 0);
  });
  const sourceData = Object.entries(sourceMap).map(([name, value]) => ({ name, value: Math.round(value as number) })).sort((a, b) => b.value - a.value);

  // Upcoming 30 days rate calendar
  const rateData = rateCalendar.slice(0, 30).map((r: any) => ({
    date: format(parseISO(r.date), 'd MMM', { locale: th }),
    rate: Number(r.rate),
    rtName: roomTypes.find((rt: any) => rt.id === r.room_type_id)?.name || '',
  }));

  const METRIC_CARDS = [
    { label: 'รายได้ 30 วัน',    value: formatCurrency(metrics.revenue30d),   icon: TrendingUp,  color: 'text-emerald-500', sub: `${metrics.bookings30d} การจอง` },
    { label: 'ADR',               value: formatCurrency(metrics.adr),          icon: BarChart3,   color: 'text-sky-500',     sub: 'เฉลี่ย/การจอง' },
    { label: 'Occupancy วันนี้',  value: `${metrics.occupancy}%`,              icon: Hotel,       color: metrics.occupancy >= 70 ? 'text-emerald-500' : metrics.occupancy >= 40 ? 'text-amber-500' : 'text-red-500', sub: `${metrics.occupiedToday}/${metrics.totalRooms} ห้อง` },
    { label: 'RevPAR (30 วัน)',   value: formatCurrency(metrics.revpar),       icon: Target,      color: 'text-violet-500',  sub: 'Revenue/Available Room' },
  ];

  return (
    <div className="container max-w-6xl py-8 animate-fade-in">
      <TopBar title="AI Revenue Manager" description="ภาพรวม revenue, forecast, และ pricing strategy"
        action={
          <Link href="/dashboard/pricing">
            <Button size="sm">
              <Sparkles className="h-3.5 w-3.5" /> AI Dynamic Pricing <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {METRIC_CARDS.map(m => {
          const Icon = m.icon;
          return (
            <Card key={m.label}><CardContent className="p-4">
              <Icon className={cn('h-5 w-5 mb-2', m.color)} />
              <div className="text-xl font-bold ticker">{m.value}</div>
              <div className="text-xs font-medium text-muted-foreground">{m.label}</div>
              <div className="text-2xs text-muted-foreground">{m.sub}</div>
            </CardContent></Card>
          );
        })}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6">
        {[{ k: 'overview', l: '📊 ภาพรวม' }, { k: 'forecast', l: '📅 ราคาข้างหน้า' }, { k: 'targets', l: '🎯 เป้าหมาย' }].map(t => (
          <button key={t.k} onClick={() => setView(t.k as any)}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium transition-colors', view === t.k ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
            {t.l}
          </button>
        ))}
      </div>

      {view === 'overview' && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-sm">รายได้รายวัน (30 วัน)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={dailyRevenue} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: any) => [formatCurrency(v), 'รายได้']} />
                  <Bar dataKey="revenue" fill="hsl(var(--accent))" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {sourceData.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-sm">รายได้ตามช่องทาง</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {sourceData.map(s => {
                    const pct = metrics.revenue30d > 0 ? (s.value / metrics.revenue30d) * 100 : 0;
                    return (
                      <div key={s.name} className="flex items-center gap-3">
                        <span className="w-24 text-sm capitalize">{s.name}</span>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-accent rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-sm font-medium w-24 text-right">{formatCurrency(s.value)}</span>
                        <span className="text-xs text-muted-foreground w-10 text-right">{pct.toFixed(0)}%</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {view === 'forecast' && (
        <div className="space-y-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Sparkles className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">ปรับราคาอัตโนมัติด้วย AI</p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">ไปที่หน้า AI Dynamic Pricing เพื่อให้ AI วิเคราะห์และแนะนำราคาที่เหมาะสม</p>
              <Link href="/dashboard/pricing" className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 hover:underline mt-1">
                AI Dynamic Pricing <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {rateData.length > 0 ? (
            <Card>
              <CardHeader><CardTitle className="text-sm">ราคา 30 วันข้างหน้า (จาก Rate Calendar)</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={rateData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `฿${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: any) => [formatCurrency(v), 'ราคา']} />
                    <Line type="monotone" dataKey="rate" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarRange className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีราคาพิเศษในปฏิทิน</p>
              <p className="text-sm mt-1">ใช้ Rate Calendar หรือ AI Dynamic Pricing เพื่อตั้งราคา</p>
            </div>
          )}
        </div>
      )}

      {view === 'targets' && (
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            ตั้งเป้าหมายรายได้รายเดือน เพื่อ track ความคืบหน้า
            <span className="text-muted-foreground/50 ml-2">(Feature coming soon — จะ track vs actuals อัตโนมัติ)</span>
          </div>
          {targets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Target className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>ยังไม่มีเป้าหมาย</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4">
              {targets.map((t: any) => (
                <Card key={t.id}><CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">{t.year}/{String(t.month).padStart(2,'0')}</div>
                  <div className="font-bold">{formatCurrency(t.target_revenue)}</div>
                  {t.actual_revenue > 0 && (
                    <div className={cn('text-sm', t.actual_revenue >= t.target_revenue ? 'text-emerald-600' : 'text-amber-600')}>
                      Actual: {formatCurrency(t.actual_revenue)}
                    </div>
                  )}
                </CardContent></Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
