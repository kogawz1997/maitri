'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, Search, Settings } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const QUICK_LINKS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/reservations', label: 'จอง' },
  { href: '/dashboard/inbox', label: 'Inbox' },
  { href: '/dashboard/rooms', label: 'ห้อง' },
  { href: '/dashboard/housekeeping', label: 'แม่บ้าน' },
];

export function MobileDashboardHeader({ hotelName }: { hotelName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur md:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card" aria-label="เปิดเมนู">
          <Menu className="h-4 w-4" />
        </button>
        <Link href="/dashboard" className="min-w-0 text-center">
          <div className="text-xs text-muted-foreground">Maitri PMS</div>
          <div className="max-w-[180px] truncate text-sm font-semibold">{hotelName}</div>
        </Link>
        <Link href="/dashboard/settings" className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card" aria-label="ตั้งค่า">
          <Settings className="h-4 w-4" />
        </Link>
      </div>
      {open && (
        <div className="space-y-3 border-t border-border px-4 py-3">
          <Link href="/dashboard/reservations" className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm text-muted-foreground" onClick={() => setOpen(false)}>
            <Search className="h-4 w-4" />
            ค้นหาการจอง / เปิดหน้างานด่วน
          </Link>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {QUICK_LINKS.map((item) => {
              const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn('whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium', active ? 'border-accent bg-accent/10 text-accent' : 'border-border bg-card text-muted-foreground')}>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </header>
  );
}
