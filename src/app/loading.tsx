export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] p-6">
      <div className="mx-auto max-w-7xl space-y-4 animate-pulse">
        <div className="h-10 w-64 rounded-xl bg-white/80" />
        <div className="h-20 rounded-2xl bg-white/80" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-72 rounded-2xl bg-white/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
