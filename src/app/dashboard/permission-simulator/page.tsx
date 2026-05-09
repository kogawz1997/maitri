'use client';
import { useMemo, useState } from 'react';
import { RBAC_MATRIX } from '@/lib/rbac-matrix';

const roles = ['owner','admin','manager','front_desk','housekeeping','maintenance','concierge','security','accounting','staff'] as const;

export default function PermissionSimulatorPage() {
  const [role, setRole] = useState<(typeof roles)[number]>('front_desk');
  const rows = useMemo(() => RBAC_MATRIX.map((r) => ({ menu: r.menu, access: (r as any)[role] })), [role]);

  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Permission Simulator</h1>
      <select className='rounded border px-3 py-2 text-sm' value={role} onChange={(e) => setRole(e.target.value as any)}>
        {roles.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <div className='rounded border divide-y'>
        {rows.map((r) => <div key={r.menu} className='flex justify-between p-2 text-sm'><span>{r.menu}</span><span className='font-medium'>{r.access}</span></div>)}
      </div>
    </div>
  );
}
