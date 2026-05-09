import Link from 'next/link';

export default function MobileAppsHubPage() {
  return (
    <main className="min-h-screen bg-[#111] text-white p-6">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-semibold">Maitri Mobile Apps Hub</h1>
        <p className="text-sm text-white/70">ศูนย์รวม entrypoint สำหรับ mobile surfaces (React Native parity flows)</p>
        <div className="grid gap-2">
          <Link className="rounded-lg border border-white/20 p-3" href="/mobile/housekeeping">Housekeeping App</Link>
          <Link className="rounded-lg border border-white/20 p-3" href="/mobile/owner-analytics">Owner Analytics App</Link>
          <Link className="rounded-lg border border-white/20 p-3" href="/mobile/guest">Guest App</Link>
        </div>
      </div>
    </main>
  );
}
