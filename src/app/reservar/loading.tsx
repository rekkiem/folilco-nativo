export default function ReservarLoading() {
  return (
    <div className="min-h-screen bg-cream-50">
      <div className="bg-forest-900 py-10">
        <div className="max-w-4xl mx-auto px-4">
          <div className="h-4 w-24 skeleton rounded mb-4" />
          <div className="h-10 w-64 skeleton rounded" />
          <div className="h-4 w-96 skeleton rounded mt-2" />
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Stepper skeleton */}
        <div className="flex items-center justify-center mb-10 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-10 h-10 skeleton rounded-full" />
              {i < 4 && <div className="w-20 h-0.5 skeleton" />}
            </div>
          ))}
        </div>
        {/* Cards skeleton */}
        <div className="grid md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-cream-200">
              <div className="h-48 skeleton" />
              <div className="p-5 space-y-3">
                <div className="h-6 skeleton rounded w-3/4" />
                <div className="h-4 skeleton rounded" />
                <div className="h-4 skeleton rounded w-2/3" />
                <div className="h-10 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
