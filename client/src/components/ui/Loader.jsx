export function Spinner({ className = 'h-6 w-6' }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
      <path d="M22 12a10 10 0 0 0-10-10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Centered spinner with screen-reader text. */
export default function Loader({ label = 'Loading…', fullPage = false }) {
  return (
    <div role="status" className={`flex items-center justify-center gap-3 text-slate-500 ${fullPage ? 'min-h-[60vh]' : 'py-12'}`}>
      <Spinner className="h-6 w-6 text-brand-blue" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export const Skeleton = ({ className = '' }) => <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} />;

export function BookCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white" aria-hidden="true">
      <Skeleton className="aspect-[3/4] rounded-none" />
      <div className="space-y-2 p-4">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-9 w-full" />
      </div>
    </div>
  );
}

export function BookGridSkeleton({ count = 8 }) {
  return (
    <div role="status" aria-label="Loading books" className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => <BookCardSkeleton key={i} />)}
    </div>
  );
}
