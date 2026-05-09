import { createAdminClient } from '@/lib/supabase/server';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminErrorsPage() {
  const admin = createAdminClient();

  // Recent audit log errors + failed webhooks
  const { data: errors } = await admin
    .from('audit_logs')
    .select('id, action, entity_type, entity_id, changes, created_at')
    .or('action.ilike.%error%,action.ilike.%fail%,action.ilike.%webhook%')
    .order('created_at', { ascending: false })
    .limit(100);

  const groups: Record<string, any[]> = {};
  errors?.forEach(e => {
    const key = e.action;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  return (
    <div className="container max-w-5xl py-8">
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-6 w-6 text-red-500" />
        <h1 className="text-2xl font-bold">Platform Error Log</h1>
        <span className="text-sm text-muted-foreground ml-auto">Last 100 events</span>
      </div>

      {/* Sentry notice */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-xl p-4 mb-6 text-sm">
        💡 สำหรับ stack traces และ error details แบบเต็ม ดูที่{' '}
        <a href="https://sentry.io" target="_blank" className="text-amber-700 font-semibold hover:underline">Sentry Dashboard →</a>
        {' '}(ตั้งค่า SENTRY_DSN ใน env)
      </div>

      {Object.entries(groups).length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <RefreshCw className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p>ไม่พบ error log</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(groups).map(([action, items]) => (
            <div key={action} className="border border-border rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
                <code className="text-sm font-mono font-semibold">{action}</code>
                <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full">{items.length}×</span>
              </div>
              <div className="divide-y divide-border">
                {items.slice(0, 5).map(e => (
                  <div key={e.id} className="px-4 py-3 text-xs">
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-muted-foreground">{e.entity_type}/{e.entity_id?.slice(0,8)}...</span>
                      <span className="text-muted-foreground">{format(parseISO(e.created_at), 'd MMM HH:mm', { locale: th })}</span>
                    </div>
                    {e.changes && <pre className="text-2xs bg-secondary rounded p-2 overflow-x-auto">{JSON.stringify(e.changes, null, 2).slice(0, 300)}</pre>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
