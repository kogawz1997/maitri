export default function BookingLoading() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-10 w-56 animate-pulse rounded bg-black/10" />
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <section className="space-y-4 rounded-2xl bg-white p-5">
            <div className="h-8 w-1/3 animate-pulse rounded bg-black/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-black/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-black/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-black/10" />
          </section>
          <aside className="h-80 animate-pulse rounded-2xl bg-white" />
        </div>
      </div>
    </main>
  );
}
