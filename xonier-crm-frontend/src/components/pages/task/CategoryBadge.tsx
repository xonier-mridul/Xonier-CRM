import { ColorOption } from "@/src/types/task/category.types";

export default function CategoryBadge({
  color,
  icon,
  name,
}: {
  color: ColorOption;
  icon: string;
  name: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${color.bg} ${color.text}`}
    >
      <span>{icon}</span>
      {name}
    </span>
  );
}
