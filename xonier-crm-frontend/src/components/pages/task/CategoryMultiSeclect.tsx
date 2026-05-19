import { CategoryMultiSelectProps } from "@/src/types/task/task.types";
import { useEffect, useRef, useState } from "react";
import { AiOutlineLoading3Quarters } from "react-icons/ai";

export default function CategoryMultiSelect({
  categories,
  selected,
  fetchCategories,
  isCatLoading,
  onChange,
}: CategoryMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: string) => {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  };

  const selectedCategories = categories.filter((c) => selected.includes(c.id));

  const handleOpen = async (open:boolean) => {
    console.log("oo: ", !open)
      setOpen((o) => !o);
    if(!open && categories.length <= 0){
      await fetchCategories();
    }

    
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        // onClick={() => setOpen((o) => !o)}
        onClick={()=>handleOpen(open)}
        className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition min-w-[160px] max-w-[240px]"
      >
        <span className="flex-1 text-left truncate">
          {selected.length === 0 ? (
            <span className="text-gray-400">All Categories</span>
          ) : selected.length === 1 ? (
            <span className="flex items-center gap-1.5">
              <span>{selectedCategories[0]?.icon}</span>
              <span className="truncate">{selectedCategories[0]?.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                {selected.length}
              </span>
              <span className="text-gray-600 dark:text-gray-300">
                categories
              </span>
            </span>
          )}
        </span>
        {selected.length > 0 ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onChange([]);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 cursor-pointer text-xs ml-1"
          >
            ✕
          </span>
        ) : (
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {!isCatLoading ? ( categories.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">
                No categories found
              </p>
            ) : (
              categories.map((cat) => {
                const isSelected = selected.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggle(cat.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm transition-colors text-left ${isSelected ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200"}`}
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? "bg-blue-500 border-blue-500" : "border-gray-300 dark:border-gray-500"}`}
                    >
                      {isSelected && (
                        <svg
                          className="w-2.5 h-2.5 text-white"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="text-base shrink-0">
                      {cat.icon ?? "📁"}
                    </span>
                    <span className="truncate font-medium">{cat.name}</span>
                    {cat.color && (
                      <span
                        className="w-2 h-2 rounded-full shrink-0 ml-auto"
                        style={{ backgroundColor: cat.color }}
                      />
                    )}
                  </button>
                );
              })
            )): <span className="text-gray-400 flex items-center gap-1 px-2"> <AiOutlineLoading3Quarters className="animate-spin"/> loading... </span>}
          </div>
          {selected.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium transition-colors"
              >
                Clear all ({selected.length})
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
