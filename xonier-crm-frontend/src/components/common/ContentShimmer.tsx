type ContentShimmerProps = {
  rows?: number;
  className?: string;
};

export default function ContentShimmer({ rows = 4, className = "" }: ContentShimmerProps) {
  return (
    <div aria-label="Loading content" role="status" className={`space-y-4 ${className}`}>
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
          <div className="premium-shimmer h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2.5 pt-1">
            <div className="premium-shimmer h-3.5 w-1/3 rounded-full" />
            <div className="premium-shimmer h-3 w-full rounded-full" />
            <div className="premium-shimmer h-3 w-2/3 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
