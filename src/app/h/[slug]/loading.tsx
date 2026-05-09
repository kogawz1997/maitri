export default function HotelDetailLoading() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="h-64 animate-pulse rounded-2xl bg-black/10 md:col-span-2" />
          <div className="h-64 animate-pulse rounded-2xl bg-black/10" />
        </div>
        <div className="h-8 w-2/5 animate-pulse rounded bg-black/10" />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="space-y-4">
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
            <div className="h-24 animate-pulse rounded-2xl bg-white" />
          </section>
          <aside className="h-80 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    </main>
  );
}
