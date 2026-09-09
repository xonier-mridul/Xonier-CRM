import { ColorOption } from "@/src/types/task/category.types";
import { Folder } from "lucide-react";

export default function CategoryBadge({
  color,
  icon,
  name,
}: {
  color?: ColorOption | null;
  icon?: string;
  name: string;
}) {
  const isEmojiFallback = !icon || icon === "❓" || icon === "?";
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-600 max-w-full truncate"
    >
      <span className="shrink-0 text-xs">
        {isEmojiFallback ? <Folder className="w-3 h-3 text-slate-400 dark:text-slate-400" /> : icon}
      </span>
      <span className="truncate">{name}</span>
    </span>
  );
}
