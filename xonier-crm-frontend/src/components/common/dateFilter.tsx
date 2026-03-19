"use client";

import { useState, useRef, useEffect } from "react";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";


function today() {
  return new Date().toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
}
function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().split("T")[0];
}

function resolveRange(value: string): DateFilter {
  const t = today();
  switch (value) {
    case "today":     return { fromDate: t,              toDate: t };
    case "last7":     return { fromDate: daysAgo(7),     toDate: t };
    case "thisMonth": return { fromDate: startOfMonth(), toDate: t };
    case "last30":    return { fromDate: daysAgo(30),    toDate: t };
    case "last3m":    return { fromDate: monthsAgo(3),   toDate: t };
    default:          return { fromDate: "",              toDate: "" };
  }
}

function dayCountLabel(filter: DateFilter): string | null {
  if (!filter.fromDate || !filter.toDate) return null;
  const from = new Date(filter.fromDate);
  const to   = new Date(filter.toDate);
  const diff = Math.round((to.getTime() - from.getTime()) / 86_400_000);
  if (diff < 0) return null;
  if (diff === 0) return "Today";
  return `${diff} day${diff === 1 ? "" : "s"}`;
}

const QUICK_RANGES = [
  { label: "Today",         value: "today"     },
  { label: "Last 7 days",   value: "last7"     },
  { label: "This month",    value: "thisMonth" },
  { label: "Last 30 days",  value: "last30"    },
  { label: "Last 3 months", value: "last3m"    },
];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  dateFilter: DateFilter;
  onChange: (filter: DateFilter) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DateFilterButton({ dateFilter, onChange }: Props) {
  const [open, setOpen]               = useState(false);
  const [from, setFrom]               = useState(dateFilter.fromDate);
  const [to,   setTo]                 = useState(dateFilter.toDate);
  const [activeRange, setActiveRange] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Sync when parent resets
  useEffect(() => {
    setFrom(dateFilter.fromDate);
    setTo(dateFilter.toDate);
  }, [dateFilter.fromDate, dateFilter.toDate]);

  // Outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Escape key
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  function handleChip(value: string) {
    if (activeRange === value) {
      setActiveRange(null);
      setFrom(""); setTo("");
    } else {
      setActiveRange(value);
      const resolved = resolveRange(value);
      setFrom(resolved.fromDate);
      setTo(resolved.toDate);
    }
  }

  function handleApply() {
    onChange({ fromDate: from, toDate: to });
    setOpen(false);
  }

  function handleClear() {
    setFrom(""); setTo(""); setActiveRange(null);
    onChange({ fromDate: "", toDate: "" });
    setOpen(false);
  }

  const isActive = !!dateFilter.fromDate || !!dateFilter.toDate;
  const dayCount = dayCountLabel(dateFilter);
  const triggerLabel = isActive
    ? dayCount ?? `${dateFilter.fromDate} → ${dateFilter.toDate}`
    : "Filter date";

  return (
    <div ref={wrapRef} className="relative inline-block">

      {/* ── Trigger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`
          flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm font-medium
          transition-all duration-150 cursor-pointer whitespace-nowrap
          ${isActive
            ? "border-indigo-500 bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400"
            : "border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
          }
        `}
      >
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>

        {triggerLabel}

        {isActive && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        )}
      </button>

      {/* ── Dropdown panel ── */}
      {open && (
        <div className="
          absolute top-[calc(100%+8px)] right-0 z-50 w-72
          rounded-2xl border p-5
          bg-white border-gray-200 shadow-xl
          dark:bg-gray-900 dark:border-white/10 dark:shadow-2xl
          animate-in fade-in slide-in-from-top-2 duration-150
        ">

          {/* Quick ranges label */}
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5 text-gray-400 dark:text-gray-600">
            Quick Ranges
          </p>

          {/* Chips */}
          <div className="flex flex-wrap gap-1.5 mb-4">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleChip(r.value)}
                className={`
                  text-[12px] font-medium px-3 py-1.5 rounded-full border
                  transition-all duration-150 cursor-pointer
                  ${activeRange === r.value
                    ? "bg-indigo-500 border-transparent text-white"
                    : "border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200 dark:border-white/10 dark:bg-white/5 dark:text-gray-300 dark:hover:bg-white/10"
                  }
                `}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <hr className="border-t mb-4 border-gray-200 dark:border-white/10" />

          {/* Custom range label */}
          <p className="text-[10px] font-bold tracking-widest uppercase mb-2.5 text-gray-400 dark:text-gray-600">
            Custom Range
          </p>

          {/* Day count preview */}
          {from && to && (
            <p className="text-[11px] text-indigo-500 dark:text-indigo-400 font-medium mb-3 -mt-1">
              {dayCountLabel({ fromDate: from, toDate: to })} selected
            </p>
          )}

          {/* From date */}
          <div className="mb-2.5">
            <label className="block text-[11px] font-medium mb-1 text-gray-400 dark:text-gray-500">
              From date
            </label>
            <div className="relative">
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => { setFrom(e.target.value); setActiveRange(null); }}
                className="
                  w-full text-[13px] px-3 py-2 pr-8 rounded-lg border outline-none
                  transition-colors duration-150
                  bg-gray-50 border-gray-200 text-gray-800
                  focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20
                  dark:bg-white/5 dark:border-white/10 dark:text-gray-100
                  dark:focus:border-indigo-500
                "
              />
              <CalIcon />
            </div>
          </div>

          {/* To date */}
          <div className="mb-4">
            <label className="block text-[11px] font-medium mb-1 text-gray-400 dark:text-gray-500">
              To date
            </label>
            <div className="relative">
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => { setTo(e.target.value); setActiveRange(null); }}
                className="
                  w-full text-[13px] px-3 py-2 pr-8 rounded-lg border outline-none
                  transition-colors duration-150
                  bg-gray-50 border-gray-200 text-gray-800
                  focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20
                  dark:bg-white/5 dark:border-white/10 dark:text-gray-100
                  dark:focus:border-indigo-500
                "
              />
              <CalIcon />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className="
                flex-1 text-[13px] font-medium py-2 rounded-lg border
                transition-all duration-150 cursor-pointer
                border-gray-200 text-gray-500 hover:bg-gray-100
                dark:border-white/10 dark:text-gray-400 dark:hover:bg-white/5
              "
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="
                flex-[2] text-[13px] font-semibold py-2 rounded-lg
                bg-indigo-500 hover:bg-indigo-600 text-white
                transition-colors duration-150 cursor-pointer
                shadow-[0_3px_12px_rgba(99,102,241,0.35)]
              "
            >
              Apply filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cal icon ──────────────────────────────────────────────────────────────────

function CalIcon() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16" fill="none"
      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 dark:text-gray-600"
    >
      <rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}