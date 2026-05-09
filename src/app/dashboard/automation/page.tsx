import { requireHotelAccess } from '@/lib/auth/guards';

const triggerLabels: Record<string, string> = {
  checkin_minus_1_day: 'ก่อนเช็กอิน 1 วัน',
  checkout_day: 'วันเช็กเอาต์',
  payment_overdue: 'ค้างชำระ',
  booking_created: 'สร้างการจองใหม่',
  post_checkout_review: 'หลังเช็กเอาต์ / ขอรีวิว',
};

export default async function AutomationPage() {
  const ctx = await requireHotelAccess(null, ['owner', 'admin', 'manager']);
  if (ctx.error) return <div className="p-6">Unauthorized</div>;

  const { data: rules } = await ctx.supabase
    .from('automation_rules')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false });

  const { data: runs } = await ctx.supabase
    .from('automation_runs')
    .select('*')
    .eq('hotel_id', ctx.hotelId)
    .order('created_at', { ascending: false })
    .limit(8);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <p className="text-sm text-muted-foreground">Phase 5</p>
        <h1 className="text-2xl font-semibold tracking-tight">Automation Center</h1>
        <p className="text-sm text-muted-foreground">ตั้ง rule อัตโนมัติสำหรับเช็กอิน ชำระเงิน เช็กเอาต์ และรีวิว</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {['checkin_minus_1_day', 'payment_overdue', 'checkout_day', 'post_checkout_review'].map((trigger) => (
          <div key={trigger} className="rounded-xl border bg-card p-4">
            <div className="text-xs uppercase text-muted-foreground">Trigger</div>
            <div className="mt-1 font-medium">{triggerLabels[trigger]}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Active Rules</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-muted-foreground"><tr><th className="py-2">Name</th><th>Trigger</th><th>Channel</th><th>Status</th></tr></thead>
            <tbody>
              {(rules || []).map((rule: any) => (
                <tr key={rule.id} className="border-t"><td className="py-2">{rule.name}</td><td>{triggerLabels[rule.trigger] || rule.trigger}</td><td>{rule.channel}</td><td>{rule.enabled ? 'Enabled' : 'Disabled'}</td></tr>
              ))}
              {!rules?.length && <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">ยังไม่มี automation rule</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 font-semibold">Recent Queue</h2>
        <div className="space-y-2">
          {(runs || []).map((run: any) => (
            <div key={run.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span>{run.channel} · {run.status}</span>
              <span className="text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
            </div>
          ))}
          {!runs?.length && <p className="text-sm text-muted-foreground">ยังไม่มีงาน automation ถูก queue</p>}
        </div>
      </div>
    </div>
  );
}
