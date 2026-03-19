export default function TagBadge({ tag }: { tag: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
      bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300
      border border-amber-200 dark:border-amber-700/40 capitalize hover:scale-105">
      {tag}
    </span>
  );
}