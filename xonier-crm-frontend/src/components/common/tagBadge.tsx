export default function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[13px] font-semibold
      bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400 capitalize">
      {tag}
    </span>
  );
}