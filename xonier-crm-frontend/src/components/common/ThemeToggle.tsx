"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type ThemeToggleProps = {
  variant?: "icon" | "cards";
  t?: (key: string) => string;
};

export default function ThemeToggle({
  variant = "icon",
  t,
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return variant === "icon" ? <div className="h-8 w-8 rounded-lg" aria-hidden="true" /> : null;
  }

  const isDark = resolvedTheme === "dark";

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        title={isDark ? "Light mode" : "Dark mode"}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100/90 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
      >
        {isDark ? <Sun size={17} strokeWidth={1.75} /> : <Moon size={17} strokeWidth={1.75} />}
      </button>
    );
  }

  const options = [
    { key: "light", icon: <Sun size={18} strokeWidth={1.75} />, label: t?.("light") ?? "Light" },
    { key: "dark", icon: <Moon size={18} strokeWidth={1.75} />, label: t?.("dark") ?? "Dark" },
    { key: "system", icon: <Monitor size={18} strokeWidth={1.75} />, label: t?.("system") ?? "System" },
  ] as const;

  return (
    <div className="grid grid-cols-3 gap-3 max-w-md">
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => setTheme(opt.key)}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
            theme === opt.key
              ? "border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20"
              : "border-slate-200 dark:border-gray-600 hover:border-slate-300 dark:hover:border-gray-500"
          }`}
        >
          <span
            className={`text-xl ${
              theme === opt.key
                ? "text-cyan-600 dark:text-cyan-400"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            {opt.icon}
          </span>

          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {opt.label}
          </span>
        </button>
      ))}
    </div>
  );
}