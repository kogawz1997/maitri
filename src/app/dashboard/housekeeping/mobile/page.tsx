import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function HousekeepingMobilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return <main className="p-6">กรุณาเข้าสู่ระบบ</main>;

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  const { data: hotel } = await supabase
    .from('hotels')
    .select('id, name')
    .eq('organization_id', profile?.organization_id)
    .limit(1)
    .single();

  const { data: tasks } = hotel ? await supabase
    .from('housekeeping_tasks')
    .select('id, task_type, priority, status, notes, due_date, rooms(room_number)')
    .eq('hotel_id', hotel.id)
    .in('status', ['pending', 'in_progress', 'failed_inspection'])
    .order('priority', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(50) : { data: [] as any[] };

  return (
    <main className="min-h-screen bg-stone-950 p-4 text-stone-50">
      <header className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 border-b border-white/10 bg-stone-950/95 px-4 py-4 backdrop-blur">
        <p className="text-xs uppercase tracking-[0.25em] text-amber-300">Maitri Mobile</p>
        <h1 className="text-2xl font-semibold">Housekeeping</h1>
        <p className="text-sm text-stone-400">{hotel?.name || 'Hotel'} · งานค้าง {tasks?.length || 0} รายการ</p>
      </header>

      <section className="grid gap-3">
        {(tasks || []).map((task: any) => (
          <article key={task.id} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-lg">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-stone-400">Room</p>
                <h2 className="text-3xl font-bold">{task.rooms?.room_number || '—'}</h2>
              </div>
              <span className="rounded-full bg-amber-400/15 px-3 py-1 text-xs font-medium text-amber-200">{task.priority}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-stone-400">Task</p>
                <p className="font-medium capitalize">{String(task.task_type || '').replace('_', ' ')}</p>
              </div>
              <div className="rounded-xl bg-black/20 p-3">
                <p className="text-stone-400">Status</p>
                <p className="font-medium capitalize">{String(task.status || '').replace('_', ' ')}</p>
              </div>
            </div>
            {task.notes ? <p className="mt-3 rounded-xl bg-black/20 p-3 text-sm text-stone-300">{task.notes}</p> : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a className="rounded-xl bg-amber-400 px-4 py-3 text-center text-sm font-semibold text-stone-950" href={`/api/housekeeping/tasks/${task.id}/start`}>เริ่มงาน</a>
              <a className="rounded-xl bg-emerald-400 px-4 py-3 text-center text-sm font-semibold text-emerald-950" href={`/api/housekeeping/tasks/${task.id}/complete`}>เสร็จแล้ว</a>
            </div>
          </article>
        ))}
        {(!tasks || tasks.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-stone-400">ไม่มีงานค้าง แม่บ้านได้พักบ้าง โลกยังพอมีเมตตา 🧹</div>
        ) : null}
      </section>
    </main>
  );
}
