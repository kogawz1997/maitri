'use client';
import { useEffect, useState } from 'react';

export default function AuditTrailPage() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    fetch('/api/team/audit-trail').then(r => r.json()).then(d => setEvents(d.events || []));
  }, []);

  return (
    <div className='p-6 space-y-4'>
      <h1 className='text-2xl font-semibold'>Audit Trail</h1>
      <div className='space-y-2'>
        {events.map((e) => (
          <div key={e.id} className='rounded border p-3 text-xs'>
            <div className='font-medium'>{e.action}</div>
            <div className='text-muted-foreground'>{new Date(e.created_at).toLocaleString()}</div>
            <pre className='mt-2 whitespace-pre-wrap'>{JSON.stringify(e.changes, null, 2)}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
