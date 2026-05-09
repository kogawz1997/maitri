import Link from 'next/link';

export default async function BookingSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ code?: string }>;
}) {
  const { slug } = await params;
  const { code } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-emerald-800">ชำระเงินสำเร็จ ✅</h1>
        <p className="mt-3 text-emerald-900">การจองของคุณได้รับการยืนยันเรียบร้อยแล้ว</p>
        <p className="mt-4 text-sm text-emerald-900/80">รหัสการจอง: <span className="font-semibold">{code || 'กำลังสร้างรหัสการจอง'}</span></p>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/portal/bookings`} className="rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800">
            ไปที่รายการจองของฉัน
          </Link>
          <Link href={`/h/${slug}`} className="rounded-lg border border-emerald-700 px-4 py-2 text-emerald-800 hover:bg-emerald-100">
            กลับไปหน้าที่พัก
          </Link>
        </div>
      </div>
    </main>
  );
}
