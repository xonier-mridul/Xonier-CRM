"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IoSunnyOutline } from "react-icons/io5";
import { LuSunMoon } from "react-icons/lu";
import { FiSun, FiMoon, FiMonitor } from "react-icons/fi";

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

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  if (variant === "icon") {
    return (
      <button
        onClick={() => setTheme(isDark ? "light" : "dark")}
        className="h-10 w-10 flex items-center justify-center text-xl rounded-full border bg-slate-50 dark:bg-[#1a2432] border-[#ecf0f2] dark:border-gray-700 hover:text-cyan-600 hover:border-cyan-600/20 transition-all"
      >
        {isDark ? <IoSunnyOutline /> : <LuSunMoon />}
      </button>
    );
  }

  const options = [
    { key: "light", icon: <FiSun />, label: t?.("light") ?? "Light" },
    { key: "dark", icon: <FiMoon />, label: t?.("dark") ?? "Dark" },
    { key: "system", icon: <FiMonitor />, label: t?.("system") ?? "System" },
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