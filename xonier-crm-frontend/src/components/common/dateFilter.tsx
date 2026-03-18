"use client";

import { useState, useRef, useEffect } from "react";
import type { DateFilter } from "@/src/types/components/ui/dateFilter.types";

// ── helpers ──────────────────────────────────────────────────────────────────

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

/** Returns { fromDate, toDate } for a quick-range value */
function resolveRange(value: string): DateFilter {
  const t = today();
  switch (value) {
    case "today":    return { fromDate: t,              toDate: t };
    case "last7":    return { fromDate: daysAgo(7),     toDate: t };
    case "thisMonth":return { fromDate: startOfMonth(), toDate: t };
    case "last30":   return { fromDate: daysAgo(30),    toDate: t };
    case "last3m":   return { fromDate: monthsAgo(3),   toDate: t };
    default:         return { fromDate: "",              toDate: "" };
  }
}

/** Human-readable day count label shown on the trigger button */
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
  { label: "Today",        value: "today"     },
  { label: "Last 7 days",  value: "last7"     },
  { label: "This month",   value: "thisMonth" },
  { label: "Last 30 days", value: "last30"    },
  { label: "Last 3 months",value: "last3m"    },
];

// ── component ────────────────────────────────────────────────────────────────

interface Props {
  dateFilter: DateFilter;
  onChange: (filter: DateFilter) => void;
  theme?: "dark" | "light";
}

export default function DateFilterButton({ dateFilter, onChange, theme = "dark" }: Props) {
  const [open, setOpen]   = useState(false);
  const [from, setFrom]   = useState(dateFilter.fromDate);
  const [to,   setTo]     = useState(dateFilter.toDate);
  const [activeRange, setActiveRange] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const dark = theme === "dark";

  // Sync if parent resets
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

  // Trigger label
  const triggerLabel = isActive
    ? dayCount ?? `${dateFilter.fromDate} → ${dateFilter.toDate}`
    : "Filter date";

  // ── theme classes ──────────────────────────────────────────────────────────
  const modal    = dark ? "bg-[#181a20] border-white/[0.08] shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
                        : "bg-white border-black/[0.1] shadow-[0_12px_40px_rgba(0,0,0,0.15)]";
  const sLabel   = dark ? "text-white/25" : "text-black/30";
  const divider  = dark ? "border-white/[0.07]" : "border-black/[0.07]";
  const label    = dark ? "text-white/40" : "text-black/40";
  const input    = dark ? "bg-[#23262f] border-white/10 text-[#e4e6f0] focus:border-indigo-500"
                        : "bg-[#f0f2f7] border-black/10 text-[#1a1d28] focus:border-indigo-500";
  const clearBtn = dark ? "border-white/10 text-white/40 hover:bg-white/5"
                        : "border-black/10 text-black/40 hover:bg-black/5";
  const chipBase = dark ? "border-white/10 bg-[#23262f] text-[#c5c8d8]"
                        : "border-black/10 bg-[#eef0f6] text-[#444]";
  const trigger  = isActive
    ? dark  ? "border-indigo-500 bg-indigo-500/10 text-indigo-400"
            : "border-indigo-500 bg-indigo-500/8 text-indigo-500"
    : dark  ? "border-white/10 bg-[#1e2029] text-white/50 hover:bg-white/5"
            : "border-black/10 bg-[#f4f5f8] text-black/50 hover:bg-black/5";

  return (
    <div ref={wrapRef} className="relative inline-block font-sans">

      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border  font-medium transition-all duration-150 cursor-pointer whitespace-nowrap ${trigger}`}
      >
        {/* Filter icon */}
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
          <path d="M2 4h12M4 8h8M6 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
        </svg>

        {triggerLabel}

        {/* Day count badge */}
        {/* {isActive && dayCount && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-indigo-500 text-white text-[10px] font-semibold leading-none">
            {dayCount}
          </span>
        )} */}

        {/* Active dot */}
        {isActive && !dayCount && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className={`absolute top-[calc(100%+8px)] right-0 z-50 w-72 border rounded-2xl p-5 animate-in fade-in slide-in-from-top-2 duration-150 ${modal} shadow-lg`}
        >
          {/* Quick ranges */}
          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2.5 ${sLabel}`}>
            Quick Ranges
          </p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => handleChip(r.value)}
                className={`text-[12px] font-medium px-3 py-1.5 rounded-full border transition-all duration-150 cursor-pointer
                  ${activeRange === r.value
                    ? "bg-indigo-500 border-transparent text-white"
                    : `${chipBase} hover:opacity-80`
                  }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <hr className={`border-t mb-4 ${divider}`} />

          {/* Custom range */}
          <p className={`text-[10px] font-bold tracking-widest uppercase mb-2.5 ${sLabel}`}>
            Custom Range
          </p>

          {/* Day count preview */}
          {from && to && (
            <p className="text-[11px] text-indigo-400 font-medium mb-3 -mt-1">
              {dayCountLabel({ fromDate: from, toDate: to })} selected
            </p>
          )}

          {/* From */}
          <div className="mb-2.5">
            <label className={`block text-[11px] font-medium mb-1 ${label}`}>From date</label>
            <div className="relative">
              <input
                type="date"
                value={from}
                max={to || undefined}
                onChange={(e) => { setFrom(e.target.value); setActiveRange(null); }}
                className={`w-full text-[13px] px-3 py-2 pr-8 rounded-lg border outline-none transition-colors duration-150 ${input}`}
              />
              <CalIcon />
            </div>
          </div>

          {/* To */}
          <div className="mb-4">
            <label className={`block text-[11px] font-medium mb-1 ${label}`}>To date</label>
            <div className="relative">
              <input
                type="date"
                value={to}
                min={from || undefined}
                onChange={(e) => { setTo(e.target.value); setActiveRange(null); }}
                className={`w-full text-[13px] px-3 py-2 pr-8 rounded-lg border outline-none transition-colors duration-150 ${input}`}
              />
              <CalIcon />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-2">
            <button
              onClick={handleClear}
              className={`flex-1 text-[13px] font-medium py-2 rounded-lg border transition-all duration-150 cursor-pointer ${clearBtn}`}
            >
              Clear
            </button>
            <button
              onClick={handleApply}
              className="flex-[2] text-[13px] font-semibold py-2 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors duration-150 cursor-pointer shadow-[0_3px_12px_rgba(99,102,241,0.35)]"
            >
              Apply filter
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function CalIcon() {
  return (
    <svg
      width="13" height="13" viewBox="0 0 16 16" fill="none"
      className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30"
    >
      <rect x="1.5" y="3" width="13" height="11.5" rx="2" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5 1.5V4M11 1.5V4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      <path d="M1.5 6.5H14.5" stroke="currentColor" strokeWidth="1.4"/>
    </svg>
  );
}