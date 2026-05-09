export default function SearchLoading() {
  return (
    <main className="min-h-screen bg-[#FAF7F2] px-4 py-6 md:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-12 w-full animate-pulse rounded-2xl bg-black/10" />
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="hidden space-y-4 rounded-2xl bg-white p-4 lg:block">
            <div className="h-6 w-24 animate-pulse rounded bg-black/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-black/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-black/10" />
            <div className="h-10 w-full animate-pulse rounded-xl bg-black/10" />
          </aside>
          <section className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-4">
                <div className="h-44 w-full animate-pulse rounded-xl bg-black/10" />
                <div className="mt-4 h-5 w-1/2 animate-pulse rounded bg-black/10" />
                <div className="mt-2 h-4 w-1/3 animate-pulse rounded bg-black/10" />
              </div>
            ))}
          </section>
        </div>
      </div>
    </main>
  );
}
