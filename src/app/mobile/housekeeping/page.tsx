import Link from 'next/link';

export default function MobileHousekeepingPage() {
  return (
    <main className="min-h-screen bg-[#0B1220] text-white p-5">
      <h1 className="text-xl font-semibold mb-2">Housekeeping App</h1>
      <p className="text-sm text-white/70 mb-4">โหมดมือถือสำหรับงานแม่บ้าน: ดูงานค้าง, เปลี่ยนสถานะห้อง, แจ้งปัญหา</p>
      <Link href="/dashboard/housekeeping/mobile" className="inline-block rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium">เปิด Mobile Board</Link>
    </main>
  );
}
