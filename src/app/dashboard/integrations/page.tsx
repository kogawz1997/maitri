import { createClient } from '@/lib/supabase/server';
import { INTEGRATIONS } from '@/lib/integrations/registry';


export const dynamic = 'force-dynamic';
function hasEnv(key: string) {
  return Boolean(process.env[key]);
}

export default async function IntegrationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user?.id || '').maybeSingle();

  const role = (profile?.role || 'staff') as 'owner' | 'admin' | 'manager' | 'staff';
  const visible = INTEGRATIONS.filter((item) => item.roles.includes(role));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Integration Readiness by Role</h1>
        <p className="text-sm text-muted-foreground">เตรียมหน้างานไว้ครบแล้ว เหลือเชื่อม provider key/API จริงตามระบบที่ต้องใช้</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((item) => {
          const ready = item.requiredEnv.every(hasEnv);
          return (
            <section key={item.key} className="rounded-2xl border border-border bg-card p-5 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">{item.name}</h2>
                <span className={`text-xs px-2 py-1 rounded-full ${ready ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                  {ready ? 'พร้อมเชื่อม' : 'รอเชื่อม'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{item.description}</p>
              <p className="text-xs text-muted-foreground">หมวด: {item.category} · สิทธิ์ที่ใช้งานได้: {item.roles.join(', ')}</p>
              <div className="rounded-xl bg-secondary/40 p-3 text-xs">
                <p className="font-medium mb-1">Environment ที่ต้องมี</p>
                <ul className="space-y-1">
                  {item.requiredEnv.map((k) => <li key={k}>{hasEnv(k) ? '✅' : '⚪'} {k}</li>)}
                </ul>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
