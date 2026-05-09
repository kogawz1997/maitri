'use client';
import { useState } from 'react';
import { t, type Locale } from '@/lib/i18n/translations';
export function LanguagePreview({ enabled }: { enabled: Locale[] }) {
  const [locale, setLocale] = useState<Locale>(enabled[0] || 'th');
  const copy = t[locale] || t.en;
  return (<div className="rounded-xl border bg-card p-4"><div className="mb-3 flex flex-wrap gap-2">{enabled.map((code) => (<button key={code} type="button" onClick={() => setLocale(code)} className={`rounded-lg border px-3 py-1 text-sm ${locale === code ? 'bg-primary text-primary-foreground' : 'bg-background'}`}>{code.toUpperCase()}</button>))}</div><div className="grid gap-2 md:grid-cols-3"><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">nav.overview</div><div className="font-medium">{copy['nav.overview']}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">common.save</div><div className="font-medium">{copy['common.save']}</div></div><div className="rounded-lg border p-3"><div className="text-xs text-muted-foreground">system.title</div><div className="font-medium">{copy['system.title']}</div></div></div></div>);
}
