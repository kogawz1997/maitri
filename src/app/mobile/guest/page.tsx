import Link from 'next/link';

export default function MobileGuestPage() {
  return (
    <main className="min-h-screen bg-[#1B102A] text-white p-5">
      <h1 className="text-xl font-semibold mb-2">Guest App</h1>
      <p className="text-sm text-white/70 mb-4">ศูนย์รวม guest journey บนมือถือ: bookings, loyalty, notifications, in-stay actions</p>
      <div className="flex flex-wrap gap-2">
        <Link href="/portal/bookings" className="rounded-lg bg-[#C66A30] px-4 py-2 text-sm font-medium">My Bookings</Link>
        <Link href="/portal/loyalty" className="rounded-lg bg-white/20 px-4 py-2 text-sm font-medium">Loyalty</Link>
      </div>
    </main>
  );
}
