'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CommandSearchItem = {
  href: string;
  label: string;
  group?: string;
  keywords?: string;
};

export function CommandSearch({ items }: { items: CommandSearchItem[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(true);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return items.slice(0, 12);
    return items.filter((item) => `${item.label} ${item.group || ''} ${item.keywords || ''} ${item.href}`.toLowerCase().includes(needle)).slice(0, 20);
  }, [items, query]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-md hover:bg-secondary transition-colors">
        <Search className="h-3 w-3" />
        <span className="flex-1 text-left">ค้นหาเมนู...</span>
        <kbd className="hidden lg:inline-block px-1.5 py-0.5 text-[10px] bg-secondary rounded">⌘K</kbd>
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/70 p-4 backdrop-blur-sm" onMouseDown={() => setOpen(false)}>
          <div className="mx-auto mt-16 max-w-xl overflow-hidden rounded-2xl border border-border bg-card shadow-[var(--shadow-lg)]" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="พิมพ์ชื่อเมนู เช่น จอง, ห้อง, billing..." className="flex-1 bg-transparent text-sm outline-none" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-1 hover:bg-secondary"><X className="h-4 w-4" /></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">ไม่พบเมนูที่ค้นหา</div> : results.map((item, index) => (
                <Link key={`${item.href}-${index}`} href={item.href} onClick={() => setOpen(false)} className={cn('flex items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-secondary', index === 0 && 'bg-secondary/60')}>
                  <span className="font-medium">{item.label}</span>
                  {item.group && <span className="text-xs text-muted-foreground">{item.group}</span>}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
