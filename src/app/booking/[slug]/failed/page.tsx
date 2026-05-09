import Link from 'next/link';

export default async function BookingFailedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ reason?: string }>;
}) {
  const { slug } = await params;
  const { reason } = await searchParams;

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm">
        <h1 className="text-2xl font-bold text-rose-800">ชำระเงินไม่สำเร็จ ❌</h1>
        <p className="mt-3 text-rose-900">ไม่สามารถยืนยันการชำระเงินได้ กรุณาลองใหม่อีกครั้ง</p>
        {reason ? <p className="mt-4 text-sm text-rose-900/80">สาเหตุ: <span className="font-semibold">{reason}</span></p> : null}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href={`/booking/${slug}`} className="rounded-lg bg-rose-700 px-4 py-2 text-white hover:bg-rose-800">
            ลองชำระเงินอีกครั้ง
          </Link>
          <Link href={`/portal/bookings`} className="rounded-lg border border-rose-700 px-4 py-2 text-rose-800 hover:bg-rose-100">
            ไปที่รายการจอง
          </Link>
        </div>
      </div>
    </main>
  );
}
