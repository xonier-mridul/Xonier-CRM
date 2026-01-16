"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { IoSunnyOutline } from "react-icons/io5";
import { LuSunMoon } from "react-icons/lu";

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-10 w-10 flex  bg-slate-50 items-center justify-center text-xl  border rounded-full dark:bg-[#1a2432] border-[#ecf0f2] dark:border-gray-700 hover:text-blue-600 cursor-pointer hover:border-blue-600/20 hover:scale-103"
    >
      {isDark ? <IoSunnyOutline /> : <LuSunMoon />}
    </button>
  );
}
