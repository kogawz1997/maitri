import Link from 'next/link';

export default function MobileOwnerAnalyticsPage() {
  return (
    <main className="min-h-screen bg-[#121212] text-white p-5">
      <h1 className="text-xl font-semibold mb-2">Owner Analytics App</h1>
      <p className="text-sm text-white/70 mb-4">แดชบอร์ด owner แบบมือถือ: รายได้รายวัน, occupancy, ADR และ alert สำคัญ</p>
      <Link href="/dashboard/reports" className="inline-block rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium">เปิดรายงาน</Link>
    </main>
  );
}
