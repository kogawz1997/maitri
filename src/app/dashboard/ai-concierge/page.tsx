import { requireHotelAccess } from '@/lib/auth/guards';

export default async function AiConciergePage() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager', 'front_desk', 'staff']);
  if (ctx.error) return <div className="p-6">Unauthorized</div>;

  const { data: knowledge } = await ctx.supabase
    .from('ai_concierge_knowledge')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false });

  const { data: logs } = await ctx.supabase
    .from('ai_concierge_logs')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Phase 5</p>
        <h1 className="text-2xl font-semibold tracking-tight">AI Concierge</h1>
        <p className="text-sm text-muted-foreground">ฐานความรู้และ log สำหรับ AI ช่วยตอบแขกแบบมี human handoff</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Knowledge Items</div><div className="text-3xl font-semibold">{knowledge?.length || 0}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Recent AI Replies</div><div className="text-3xl font-semibold">{logs?.length || 0}</div></div>
        <div className="rounded-xl border bg-card p-4"><div className="text-sm text-muted-foreground">Mode</div><div className="text-lg font-semibold">Assist first, human approve</div></div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Knowledge Base</h2>
        <div className="space-y-2">
          {(knowledge || []).map((item: any) => <div key={item.id} className="rounded-lg border p-3"><div className="font-medium">{item.title}</div><p className="line-clamp-2 text-sm text-muted-foreground">{item.content}</p></div>)}
          {!knowledge?.length && <p className="text-sm text-muted-foreground">เพิ่มข้อมูลโรงแรม นโยบาย สิ่งอำนวยความสะดวก และ FAQ ได้จาก API/table นี้</p>}
        </div>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Recent AI Logs</h2>
        <div className="space-y-2">
          {(logs || []).map((log: any) => <div key={log.id} className="rounded-lg border p-3 text-sm"><div className="text-muted-foreground">Confidence: {Math.round((log.confidence || 0) * 100)}% · {log.needs_human ? 'Needs human' : 'Auto safe'}</div><div className="mt-1 line-clamp-2">{log.output}</div></div>)}
          {!logs?.length && <p className="text-sm text-muted-foreground">ยังไม่มี AI log</p>}
        </div>
      </div>
    </div>
  );
}
