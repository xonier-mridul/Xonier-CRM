"use client";

import React from "react";
import { useTranslation } from "react-i18next";
import { FiFilter, FiX } from "react-icons/fi";
import { DateFilterType, RatingFilterType, OnTimeFilterType } from "@/src/types";

const DATE_PRESETS: { label: string; value: DateFilterType }[] = [
  { label: "All Time", value: "all" },
  { label: "Today", value: "today" },
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "This Year", value: "year" },
  { label: "Custom Range", value: "custom" },
];

const RATING_OPTIONS: { label: string; value: RatingFilterType }[] = [
  { label: "All Ratings", value: "all" },
  { label: "Rated Only", value: "rated" },
  { label: "Unrated Only", value: "unrated" },
  { label: "★★★★★ 5 Stars", value: "5" },
  { label: "★★★★ 4 Stars", value: "4" },
  { label: "★★★ 3 Stars", value: "3" },
  { label: "★★ 2 Stars", value: "2" },
  { label: "★ 1 Star", value: "1" },
];

const ON_TIME_OPTIONS: { label: string; value: OnTimeFilterType }[] = [
  { label: "All Tasks", value: "all" },
  { label: "On Time", value: "onTime" },
  { label: "Overdue", value: "overdue" },
];

interface FilterBarProps {
  dateFilter: DateFilterType;
  setDateFilter: (v: DateFilterType) => void;
  customStart: string;
  setCustomStart: (v: string) => void;
  customEnd: string;
  setCustomEnd: (v: string) => void;
  ratingFilter: RatingFilterType;
  setRatingFilter: (v: RatingFilterType) => void;
  onTimeFilter: OnTimeFilterType;
  setOnTimeFilter: (v: OnTimeFilterType) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
  isLoading?: boolean;
}

export const FilterBar = ({
  dateFilter,
  setDateFilter,
  customStart,
  setCustomStart,
  customEnd,
  setCustomEnd,
  ratingFilter,
  setRatingFilter,
  onTimeFilter,
  setOnTimeFilter,
  onReset,
  hasActiveFilters,
  isLoading,
}: FilterBarProps) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5 relative">
      {isLoading && (
        <div className="absolute inset-0 bg-white/40 dark:bg-gray-800/40 rounded-2xl flex items-center justify-center z-10">
          <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
            <FiFilter className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
              {t("filters") || "Filters"}
            </h3>
            <p className="text-xs text-gray-400">
              {t("filter_description") || "Refine performance data"}
            </p>
          </div>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1 text-xs font-semibold text-rose-500 hover:text-rose-600 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
          >
            <FiX className="w-3 h-3" />
            {t("clear_filters") || "Clear All"}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Date Filter */}
        <div className="flex-1 min-w-[180px]">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
            {t("time_period") || "Time Period"}
          </label>
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterType)}
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer"
          >
            {DATE_PRESETS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Custom Date Range */}
        {dateFilter === "custom" && (
          <>
            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                {t("from") || "From"}
              </label>
              <input
                type="date"
                value={customStart}
                max={customEnd || undefined}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
            <div className="flex-1 min-w-[150px]">
              <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
                {t("to") || "To"}
              </label>
              <input
                type="date"
                value={customEnd}
                min={customStart || undefined}
                max={new Date().toISOString().split("T")[0]}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>
          </>
        )}

        {/* Rating Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
            {t("rating") || "Rating"}
          </label>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value as RatingFilterType)}
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            {RATING_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* On Time Filter */}
        <div className="flex-1 min-w-[160px]">
          <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5 block">
            {t("timeliness") || "Timeliness"}
          </label>
          <select
            value={onTimeFilter}
            onChange={(e) => setOnTimeFilter(e.target.value as OnTimeFilterType)}
            className="w-full text-sm px-3 py-2.5 rounded-xl border border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-400 cursor-pointer"
          >
            {ON_TIME_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100 dark:border-gray-700">
          {dateFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
              {DATE_PRESETS.find((d) => d.value === dateFilter)?.label}
            </span>
          )}
          {ratingFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
              {RATING_OPTIONS.find((r) => r.value === ratingFilter)?.label}
            </span>
          )}
          {onTimeFilter !== "all" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">
              {ON_TIME_OPTIONS.find((o) => o.value === onTimeFilter)?.label}
            </span>
          )}
        </div>
      )}
    </div>
  );
};