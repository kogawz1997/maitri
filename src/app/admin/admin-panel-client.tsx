'use client';

import { useState } from 'react';
import { formatCurrency, cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Building2, Users, TrendingUp, Activity, Search, ToggleLeft, ToggleRight, Eye, LogIn } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { th } from 'date-fns/locale';

const PLAN_COLOR: Record<string, string> = {
  starter:    'bg-secondary text-muted-foreground',
  standard:   'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  pro:        'bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300',
  enterprise: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
};

const STATUS_COLOR: Record<string, string> = {
  active:   'text-emerald-500',
  trialing: 'text-sky-500',
  past_due: 'text-red-500',
  cancelled:'text-muted-foreground',
};

export function AdminPanelClient({ orgs, stats }: { orgs: any[]; stats: any }) {
  const [q, setQ]         = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = orgs.filter(o => {
    const matchQ = !q || o.name?.toLowerCase().includes(q.toLowerCase());
    const matchF = filter === 'all' || o.subscription_plan === filter || o.subscription_status === filter;
    return matchQ && matchF;
  });

  async function startImpersonation(orgId: string) {
    const reason = window.prompt('เหตุผลในการ impersonate tenant?') || 'support';
    const res = await fetch(`/api/admin/orgs/${orgId}/impersonate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.redirectTo) {
      toast.success('เริ่ม support session แล้ว');
      window.location.href = data.redirectTo;
    } else toast.error(data.error || 'เริ่ม support session ไม่สำเร็จ');
  }

  async function toggleOrg(orgId: string, active: boolean) {
    const res = await fetch('/api/admin/orgs', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId, action: active ? 'suspend' : 'reactivate' }),
    });
    if (res.ok) {
      toast.success(active ? 'ระงับองค์กรแล้ว' : 'เปิดใช้งานแล้ว');
    } else toast.error('ดำเนินการไม่สำเร็จ');
  }

  return (
    <div className="container max-w-7xl py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 bg-red-100 dark:bg-red-950/30 text-red-700 dark:text-red-300 text-xs font-medium px-3 py-1.5 rounded-full mb-3">
          🔐 Platform Admin Panel
        </div>
        <h1 className="text-2xl font-bold">SaaS Control Center</h1>
        <p className="text-muted-foreground text-sm mt-1">จัดการ tenants, subscriptions, และ platform health</p>
        <a href="/admin/errors" className="inline-block mt-3 text-sm text-primary hover:underline">ดู error dashboard →</a>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { icon: Building2,  label: 'Organizations', value: stats.totalOrgs,             color: 'text-sky-500' },
          { icon: Users,      label: 'Hotels',        value: stats.totalHotels,            color: 'text-emerald-500' },
          { icon: TrendingUp, label: 'MRR (฿)',        value: formatCurrency(stats.mrr),    color: 'text-violet-500' },
          { icon: Activity,   label: 'New this month', value: stats.newThisMonth,           color: 'text-amber-500' },
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

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="ค้นหาองค์กร..."
            className="w-full pl-9 pr-4 py-2 bg-secondary border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        {['all', 'starter', 'standard', 'pro', 'active', 'past_due', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={cn('px-3 py-2 rounded-xl text-xs font-medium transition-colors', filter === f ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground')}>
            {f}
          </button>
        ))}
      </div>

      {/* Orgs table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Organization</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Hotels</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(org => {
                  const isSuspended = org.subscription_status === 'cancelled';
                  const hotelCount  = org.hotels?.[0]?.count || 0;
                  return (
                    <tr key={org.id} className="border-b border-border hover:bg-secondary/30 transition-colors">
                      <td className="p-4">
                        <div className="font-medium">{org.name || 'Unnamed'}</div>
                        <div className="text-xs text-muted-foreground font-mono">{org.id.slice(0, 8)}...</div>
                      </td>
                      <td className="p-4">
                        <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', PLAN_COLOR[org.subscription_plan] || PLAN_COLOR.starter)}>
                          {org.subscription_plan}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={cn('text-xs font-medium', STATUS_COLOR[org.subscription_status] || 'text-muted-foreground')}>
                          {org.subscription_status || 'active'}
                        </span>
                      </td>
                      <td className="p-4 text-muted-foreground">{hotelCount}</td>
                      <td className="p-4 text-muted-foreground">
                        {org.created_at ? format(parseISO(org.created_at), 'd MMM yy', { locale: th }) : '-'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => toggleOrg(org.id, !isSuspended)}
                            title={isSuspended ? 'เปิดใช้งาน' : 'ระงับ'}>
                            {isSuspended
                              ? <ToggleLeft className="h-5 w-5 text-muted-foreground hover:text-emerald-500 transition-colors" />
                              : <ToggleRight className="h-5 w-5 text-emerald-500 hover:text-red-500 transition-colors" />
                            }
                          </button>
                          <button onClick={() => startImpersonation(org.id)} title="Support impersonation" className="p-1 hover:text-accent transition-colors">
                            <LogIn className="h-4 w-4" />
                          </button>
                          <a href={`/admin/orgs/${org.id}`} className="p-1 hover:text-accent transition-colors">
                            <Eye className="h-4 w-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">ไม่พบองค์กร</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
