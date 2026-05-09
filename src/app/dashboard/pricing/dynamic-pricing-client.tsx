'use client';

import { useState } from 'react';
import { TopBar } from '@/components/layout/top-bar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Sparkles, TrendingUp, TrendingDown, Minus, Check, RefreshCw, BarChart3 } from 'lucide-react';

export function DynamicPricingClient({ hotelId, hotelName, roomTypes }: { hotelId: string; hotelName: string; roomTypes: any[] }) {
  const [selectedRt, setSelectedRt] = useState(roomTypes[0]?.id || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const rt = roomTypes.find(r => r.id === selectedRt);

  async function analyze() {
    if (!selectedRt) return;
    setLoading(true);
    setSuggestions([]);
    setSelected([]);
    const res = await fetch('/api/ai/dynamic-pricing', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId, roomTypeId: selectedRt, daysAhead: 60 }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error || 'วิเคราะห์ไม่สำเร็จ'); setLoading(false); return; }
    setSuggestions(data.suggestions || []);
    setStats(data.stats);
    setSelected((data.suggestions || []).filter((s: any) => s.confidence === 'high').map((s: any) => s.date));
    setLoading(false);
    toast.success(`AI แนะนำ ${data.suggestions?.length || 0} วันที่ควรปรับราคา`);
  }

  async function applySelected() {
    const toApply = suggestions.filter(s => selected.includes(s.date));
    if (!toApply.length) { toast.error('เลือกวันที่ก่อน'); return; }
    setApplying(true);
    const res = await fetch('/api/ai/dynamic-pricing', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hotelId, roomTypeId: selectedRt, suggestions: toApply }),
    });
    setApplying(false);
    if (res.ok) {
      toast.success(`บันทึกราคา ${toApply.length} วันแล้ว`);
      setSuggestions(p => p.filter(s => !selected.includes(s.date)));
      setSelected([]);
    } else toast.error('บันทึกไม่สำเร็จ');
  }

  const toggleSelect = (date: string) => setSelected(p => p.includes(date) ? p.filter(d => d !== date) : [...p, date]);

  return (
    <div className="container max-w-5xl py-8 animate-fade-in">
      <TopBar title="AI Dynamic Pricing" description="ให้ AI วิเคราะห์ demand และแนะนำราคาที่เหมาะสม"
        action={
          <div className="flex gap-2">
            {suggestions.length > 0 && selected.length > 0 && (
              <Button size="sm" onClick={applySelected} disabled={applying}>
                <Check className="h-3.5 w-3.5" /> {applying ? 'กำลังบันทึก...' : `บันทึก ${selected.length} วัน`}
              </Button>
            )}
            <Button size="sm" onClick={analyze} disabled={loading} variant={suggestions.length > 0 ? 'outline' : 'default'}>
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {loading ? 'กำลังวิเคราะห์...' : 'วิเคราะห์ด้วย AI'}
            </Button>
          </div>
        }
      />

      {/* Room type selector */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {roomTypes.map(rt => (
          <button key={rt.id} onClick={() => { setSelectedRt(rt.id); setSuggestions([]); setStats(null); }}
            className={cn('px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors', selectedRt === rt.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
            {rt.name} <span className="opacity-60 ml-1">{formatCurrency(rt.base_rate)}</span>
          </button>
        ))}
      </div>

      {/* Stats from analysis */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {stats.dowStats?.filter((_: any, i: number) => [5, 6, 0, 1].includes(i)).map((d: any) => (
            <Card key={d.day}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground mb-1">{d.day}</div>
                <div className={cn('text-xl font-bold ticker', d.occupancyPct >= 70 ? 'text-emerald-600' : d.occupancyPct >= 40 ? 'text-amber-600' : 'text-red-500')}>
                  {d.occupancyPct}%
                </div>
                <div className="text-2xs text-muted-foreground">Occupancy (90 วัน)</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {loading && (
        <div className="flex flex-col items-center py-20 gap-4">
          <div className="h-12 w-12 border-3 border-accent/20 border-t-accent rounded-full animate-spin" />
          <p className="text-muted-foreground text-sm">AI กำลังวิเคราะห์ demand pattern ของ {rt?.name}...</p>
          <p className="text-muted-foreground text-xs">วิเคราะห์ 365 วันที่ผ่านมา + seasonal patterns</p>
        </div>
      )}

      {!loading && suggestions.length === 0 && !stats && (
        <div className="text-center py-20">
          <Sparkles className="h-16 w-16 mx-auto mb-4 text-accent/30" />
          <h3 className="font-semibold text-lg mb-2">AI Revenue Manager</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            กดวิเคราะห์ด้วย AI เพื่อให้ระบบวิเคราะห์ demand pattern และแนะนำราคาที่เหมาะสมสำหรับ 60 วันข้างหน้า
          </p>
          <Button onClick={analyze} size="lg">
            <Sparkles className="h-4 w-4" /> เริ่มวิเคราะห์
          </Button>
        </div>
      )}

      {!loading && suggestions.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {suggestions.length} วันที่แนะนำ · เลือกแล้ว {selected.length} วัน
            </p>
            <div className="flex gap-2">
              <button onClick={() => setSelected(suggestions.map(s => s.date))} className="text-xs text-accent hover:underline">เลือกทั้งหมด</button>
              <span className="text-muted-foreground">·</span>
              <button onClick={() => setSelected([])} className="text-xs text-muted-foreground hover:underline">ล้าง</button>
            </div>
          </div>

          <div className="space-y-2">
            {suggestions.map(s => {
              const diff = s.suggested_rate - Number(rt?.base_rate);
              const pct  = Math.round((diff / Number(rt?.base_rate)) * 100);
              const isUp = diff > 0;
              const isSel = selected.includes(s.date);

              return (
                <button key={s.date} onClick={() => toggleSelect(s.date)}
                  className={cn('w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all', isSel ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/30 bg-card')}>
                  <div className={cn('h-5 w-5 rounded border-2 shrink-0 flex items-center justify-center transition-colors', isSel ? 'bg-accent border-accent' : 'border-border')}>
                    {isSel && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-medium">{s.date}</span>
                      <span className={cn('text-2xs px-2 py-0.5 rounded-full font-medium',
                        s.confidence === 'high' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' :
                        s.confidence === 'medium' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300' :
                        'bg-secondary text-muted-foreground')}>
                        {s.confidence}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.reason}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-bold ticker">{formatCurrency(s.suggested_rate)}</div>
                    <div className={cn('flex items-center gap-1 text-xs justify-end', isUp ? 'text-emerald-600' : 'text-red-500')}>
                      {isUp ? <TrendingUp className="h-3 w-3" /> : diff < 0 ? <TrendingDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {isUp ? '+' : ''}{pct}%
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
