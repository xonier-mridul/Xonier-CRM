"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { TaskDataForUser, DateFilterType, RatingFilterType, OnTimeFilterType } from "@/src/types";
import {
  IoPersonCircle,
  IoCheckmarkDoneCircle,
  IoTrendingUp,
} from "react-icons/io5";
import { MdEmail, MdPhone, MdVerified } from "react-icons/md";
import {
  FiCalendar,
  FiClock,
  FiCheckCircle,
  FiAlertCircle,
  FiArrowLeft,
  FiAward,
} from "react-icons/fi";
import { HiStar } from "react-icons/hi2";
import { BsClipboardCheck } from "react-icons/bs";
import { GoDotFill } from "react-icons/go";
import { useTranslation } from "react-i18next";
import { useUserRatingData } from "@/src/hooks/useUserRatingData";
import { FilterBar } from "@/src/components/rating/FilterBar";
import { MonthlyTrendChart } from "@/src/components/rating/MonthlyTrendChart";

// ── Fractional Star Rating ────────────────────────────────────────────────────
const StarRating = ({
  rating,
  size = "md",
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeMap = { sm: "w-3.5 h-3.5", md: "w-5 h-5", lg: "w-6 h-6" };
  const cls = sizeMap[size];

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const fill = Math.min(1, Math.max(0, rating - (star - 1)));
        const fillPct = Math.round(fill * 100);
        const uid = `sr-${star}-${Math.round(rating * 100)}-${size}`;
        return (
          <svg
            key={star}
            viewBox="0 0 20 20"
            className={`${cls} shrink-0`}
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset={`${fillPct}%`} stopColor="#f59e0b" stopOpacity="1" />
                <stop offset={`${fillPct}%`} stopColor="#f59e0b" stopOpacity="0.18" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${uid})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
            />
          </svg>
        );
      })}
    </div>
  );
};

// ── Rating Config ─────────────────────────────────────────────────────────────
const getRatingConfig = (rating: number) => {
  if (rating >= 4.5)
    return {
      label: "Excellent",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
      bar: "bg-emerald-500",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-600 dark:text-emerald-400",
      glow: "shadow-emerald-100 dark:shadow-emerald-900/20",
      gradient: "from-emerald-500 to-teal-500",
      iconBg: "bg-emerald-50 dark:bg-emerald-900/30",
    };
  if (rating >= 3.5)
    return {
      label: "Good",
      badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
      bar: "bg-blue-500",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-600 dark:text-blue-400",
      glow: "shadow-blue-100 dark:shadow-blue-900/20",
      gradient: "from-blue-500 to-indigo-500",
      iconBg: "bg-blue-50 dark:bg-blue-900/30",
    };
  if (rating >= 2.5)
    return {
      label: "Average",
      badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
      bar: "bg-amber-500",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-600 dark:text-amber-400",
      glow: "shadow-amber-100 dark:shadow-amber-900/20",
      gradient: "from-amber-500 to-orange-400",
      iconBg: "bg-amber-50 dark:bg-amber-900/30",
    };
  if (rating >= 1.5)
    return {
      label: "Poor",
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      bar: "bg-orange-500",
      border: "border-orange-200 dark:border-orange-800",
      text: "text-orange-600 dark:text-orange-400",
      glow: "shadow-orange-100 dark:shadow-orange-900/20",
      gradient: "from-orange-500 to-red-400",
      iconBg: "bg-orange-50 dark:bg-orange-900/30",
    };
  return {
    label: "Very Poor",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    bar: "bg-red-500",
    border: "border-red-200 dark:border-red-800",
    text: "text-red-600 dark:text-red-400",
    glow: "shadow-red-100 dark:shadow-red-900/20",
    gradient: "from-red-500 to-rose-500",
    iconBg: "bg-red-50 dark:bg-red-900/30",
  };
};

// ── Skeleton ──────────────────────────────────────────────────────────────────
const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5 animate-pulse">
    <div className="flex justify-between items-start gap-4">
      <div className="space-y-2.5 flex-1">
        <div className="h-4 bg-slate-200 dark:bg-gray-700 rounded-lg w-3/4" />
        <div className="flex gap-3">
          <div className="h-3 bg-slate-100 dark:bg-gray-700/60 rounded w-24" />
          <div className="h-3 bg-slate-100 dark:bg-gray-700/60 rounded w-20" />
        </div>
      </div>
      <div className="h-14 w-28 bg-slate-200 dark:bg-gray-700 rounded-xl shrink-0" />
    </div>
    <div className="mt-4 h-12 bg-slate-100 dark:bg-gray-700/50 rounded-xl" />
  </div>
);

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({
  icon,
  label,
  value,
  sub,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  gradient: string;
}) => (
  <div className="relative overflow-hidden bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-5">
    <div className="flex items-start gap-4">
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-lg shrink-0 shadow-sm`}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-900 dark:text-white mt-0.5 tabular-nums">
          {value}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
    <div className={`absolute -right-3 -bottom-3 w-16 h-16 rounded-full bg-gradient-to-br ${gradient} opacity-[0.08]`} />
  </div>
);

// ── Task Card ─────────────────────────────────────────────────────────────────
const TaskCard = ({ task, index }: { task: TaskDataForUser; index: number }) => {
  const { t } = useTranslation();
  const cfg = task.rating ? getRatingConfig(task.rating) : null;
  const isOverdue = task.isOverdue;

  return (
    <div className="group relative bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden transition-all duration-200 hover:border-indigo-200 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-black/20">
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
          cfg ? cfg.gradient : "from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600"
        } opacity-70 group-hover:opacity-100 transition-opacity`}
      />
      <div className="p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-gray-700 flex items-center justify-center mt-0.5">
            <span className="text-xs font-bold text-gray-400 tabular-nums">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-snug">
                  {task.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2.5 mt-2">
                  {task.completedAt && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-slate-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">
                      <FiCalendar className="w-2.5 h-2.5" />
                      {new Date(task.completedAt as string).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400 bg-slate-50 dark:bg-gray-700/50 px-2 py-0.5 rounded-md">
                    <FiClock className="w-2.5 h-2.5" />
                    {t("est")} <span className="text-gray-600 dark:text-gray-300">{task.estimatedHours || 0}h</span>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                      isOverdue
                        ? "bg-rose-50 dark:bg-rose-900/20 text-rose-500"
                        : "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    {isOverdue ? <FiAlertCircle className="w-2.5 h-2.5" /> : <FiCheckCircle className="w-2.5 h-2.5" />}
                    {t("act")} {task.actualHours || 0}h
                    {isOverdue && <span className="ml-0.5 font-bold">{t("overdue_2")}</span>}
                  </span>
                </div>
              </div>

              {task.rating && cfg ? (
                <div className={`shrink-0 flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl border ${cfg.border} ${cfg.iconBg} min-w-[90px]`}>
                  <span className={`text-2xl font-black tabular-nums leading-none ${cfg.text}`}>
                    {task.rating.toFixed(1)}
                  </span>
                  <StarRating rating={task.rating} size="sm" />
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.badge}`}>
                    {cfg.label}
                  </span>
                </div>
              ) : (
                <div className="shrink-0 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl border border-dashed border-slate-200 dark:border-gray-600 min-w-[90px]">
                  <HiStar className="w-5 h-5 text-gray-200 dark:text-gray-600" />
                  <span className="text-[10px] text-gray-400 font-medium">{t("not_rated")}</span>
                </div>
              )}
            </div>

            {task.remark && (
              <div className="mt-3.5 relative">
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-400 to-violet-400 rounded-full" />
                <div className="pl-3.5 pr-3 py-2.5 bg-slate-50 dark:bg-gray-700/40 rounded-r-xl rounded-bl-xl">
                  <p className="text-xs text-gray-500 dark:text-gray-400 italic leading-relaxed">
                    {t("ldquo")}{task.remark}{t("rdquo")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserRatingPage() {
  const { t } = useTranslation();
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Filter state
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");

  // Raw (uncommitted) custom date inputs — bound directly to the date pickers.
  // Changing these does NOT trigger an API call.
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");

  // Applied (committed) custom date values — these are the ones actually
  // passed down to the data-fetching hook. They only change when the user
  // clicks the "Search" button in the FilterBar.
  const [appliedCustomStart, setAppliedCustomStart] = useState<string>("");
  const [appliedCustomEnd, setAppliedCustomEnd] = useState<string>("");

  const [ratingFilter, setRatingFilter] = useState<RatingFilterType>("all");
  const [onTimeFilter, setOnTimeFilter] = useState<OnTimeFilterType>("all");

  const {
    user,
    tasks,
    page,
    totalPages,
    totalTasks,
    isInitialLoading,
    isFilterLoading,
    isFetchingMore,
    error,
    loadMore,
  } = useUserRatingData({
    userId: id,
    dateFilter,
    customStart: appliedCustomStart,
    customEnd: appliedCustomEnd,
    ratingFilter,
    onTimeFilter,
  });

  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);

  const hasActiveFilters = dateFilter !== "all" || ratingFilter !== "all" || onTimeFilter !== "all";

  const resetFilters = () => {
    setDateFilter("all");
    setCustomStart("");
    setCustomEnd("");
    setAppliedCustomStart("");
    setAppliedCustomEnd("");
    setRatingFilter("all");
    setOnTimeFilter("all");
  };

  // When the date preset dropdown changes, reset custom range state
  // whenever the user moves away from "custom" (or into it fresh).
  const handleDateFilterChange = (v: DateFilterType) => {
    setDateFilter(v);
    if (v !== "custom") {
      setCustomStart("");
      setCustomEnd("");
      setAppliedCustomStart("");
      setAppliedCustomEnd("");
    }
  };

  // Only called when the user explicitly clicks "Search" for custom range
  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return;
    setAppliedCustomStart(customStart);
    setAppliedCustomEnd(customEnd);
  };

  const isCustomRangeReady = Boolean(customStart && customEnd);
  const isCustomRangeDirty =
    customStart !== appliedCustomStart || customEnd !== appliedCustomEnd;

  // Infinite scroll observer
  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { root: null, rootMargin: "120px", threshold: 0.1 }
    );
    if (loadMoreRef.current) observer.observe(loadMoreRef.current);
    return () => {
      if (loadMoreRef.current) observer.unobserve(loadMoreRef.current);
    };
  }, [loadMore]);

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (isInitialLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
        <div className="p-6 max-w-5xl mx-auto space-y-5">
          <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden animate-pulse">
            <div className="h-32 bg-gradient-to-r from-slate-200 to-slate-300 dark:from-gray-700 dark:to-gray-600" />
            <div className="px-6 pb-6 -mt-10 flex items-end justify-between">
              <div className="w-20 h-20 rounded-2xl bg-slate-300 dark:bg-gray-600 border-4 border-white dark:border-gray-800" />
              <div className="h-16 w-44 bg-slate-200 dark:bg-gray-700 rounded-2xl mb-1" />
            </div>
            <div className="px-6 pb-6 space-y-2">
              <div className="h-6 w-48 bg-slate-200 dark:bg-gray-700 rounded-lg" />
              <div className="h-4 w-64 bg-slate-100 dark:bg-gray-700/50 rounded" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl animate-pulse" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error || !user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-gray-900 flex items-center justify-center p-6">
        <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-16 text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <IoPersonCircle className="w-9 h-9 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-2">
            {t("something_went_wrong")}
          </h2>
          <p className="text-gray-400 text-sm mb-7">{error || "User not found"}</p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-indigo-200 dark:shadow-indigo-900/30"
          >
            <FiArrowLeft className="w-4 h-4" />
            {t("go_back")}
          </button>
        </div>
      </div>
    );
  }

  const stats = user.stats;
  const ratingCfg = stats?.overallRating ? getRatingConfig(stats.overallRating) : null;
  const loadedPct = totalTasks > 0 ? Math.round((tasks.length / totalTasks) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
      <div className="p-6 mx-auto space-y-5 font-sans">
        {/* ── Hero Profile Card ─────────────────────────────────────────── */}
        <div className="relative bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="h-32 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800" />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(6,182,212,0.55) 0%, rgba(20,184,166,0.45) 50%, rgba(59,130,246,0.35) 100%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)`,
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute right-12 top-6 w-20 h-20 rounded-full bg-white/5 blur-sm" />
            <div className="absolute right-32 bottom-1 w-10 h-10 rounded-full bg-white/5 blur-sm" />
          </div>

          <div className="px-6 pb-6">
            <div className="flex items-end justify-between -mt-11 mb-5 flex-wrap gap-4">
              <div className="relative">
                <div className="w-[84px] h-[84px] rounded-2xl border-4 border-white dark:border-gray-800 bg-gradient-to-br from-cyan-500 via-teal-500 to-cyan-600 flex items-center justify-center shadow-xl">
                  <span className="text-2xl font-black text-white uppercase tracking-tight">
                    {user.firstName?.charAt(0)}
                    {user.lastName?.charAt(0)}
                  </span>
                </div>
                <div
                  className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white dark:border-gray-800 ${
                    user.status === "active" ? "bg-emerald-500" : "bg-gray-400"
                  }`}
                />
              </div>

              {ratingCfg && stats?.overallRating ? (
                <div className={`flex relative items-center gap-3.5 px-5 py-3 rounded-2xl border-2 ${ratingCfg.border} bg-white dark:bg-gray-800 shadow-md ${ratingCfg.glow}`}>
                  <div className="text-center">
                    <p className={`text-3xl font-black tabular-nums leading-none ${ratingCfg.text}`}>
                      {stats.overallRating.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">{t("out_of_5")}</p>
                  </div>
                  <div className="w-px h-10 bg-slate-100 dark:bg-gray-700" />
                  <div className="flex flex-col gap-1.5">
                    <StarRating rating={stats.overallRating} size="md" />
                    <span className={`text-[10px] font-bold text-center px-2 py-0.5 rounded-full ${ratingCfg.badge}`}>
                      {ratingCfg.label}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl border border-dashed border-slate-200 dark:border-gray-600 bg-slate-50 dark:bg-gray-700/30">
                  <HiStar className="w-5 h-5 text-gray-300 dark:text-gray-600" />
                  <span className="text-sm text-gray-400 font-medium">{t("no_rating_yet")}</span>
                </div>
              )}
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight capitalize">
                  {user.firstName} {user.lastName}
                </h1>
                {user.isEmailVerified && (
                  <MdVerified className="w-5 h-5 text-blue-500 shrink-0" title={t("email_verified")} />
                )}
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full capitalize ${
                    user.status === "active"
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  <GoDotFill className="w-2 h-2" />
                  {user.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-1.5">
                <a href={`mailto:${user.email}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  <MdEmail className="w-4 h-4" />
                  {user.email}
                </a>
                {user.phone && (
                  <a href={`tel:${user.phone}`} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                    <MdPhone className="w-4 h-4" />
                    {user.phone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── Filter Bar ────────────────────────────────────────────────── */}
        <FilterBar
          dateFilter={dateFilter}
          setDateFilter={handleDateFilterChange}
          customStart={customStart}
          setCustomStart={setCustomStart}
          customEnd={customEnd}
          setCustomEnd={setCustomEnd}
          ratingFilter={ratingFilter}
          setRatingFilter={setRatingFilter}
          onTimeFilter={onTimeFilter}
          setOnTimeFilter={setOnTimeFilter}
          onReset={resetFilters}
          hasActiveFilters={hasActiveFilters}
          isLoading={isFilterLoading}
          onApplyCustomRange={handleApplyCustomRange}
          isCustomRangeReady={isCustomRangeReady}
          isCustomRangeDirty={isCustomRangeDirty}
        />

        {/* ── Stat Cards (backend-computed, accurate for full filtered set) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<BsClipboardCheck className="w-5 h-5" />}
            label={t("total_tasks")}
            value={stats?.totalTasksDone ?? 0}
            sub={`${stats?.ratingRate ?? 0}% rated`}
            gradient="from-indigo-500 to-violet-500"
          />
          <StatCard
            icon={<FiCheckCircle className="w-5 h-5" />}
            label={t("on_time_rate")}
            value={`${stats?.onTimeRate ?? 0}%`}
            sub={`${stats?.onTimeTasksCount ?? 0}/${stats?.totalTasksDone ?? 0} tasks`}
            gradient="from-emerald-500 to-teal-500"
          />
          <StatCard
            icon={<FiClock className="w-5 h-5" />}
            label={t("efficiency")}
            value={stats?.efficiencyRate ? `${stats.efficiencyRate}%` : "—"}
            sub={
              stats?.efficiencyRate
                ? stats.efficiencyRate < 100
                  ? "Faster than estimated"
                  : "Slower than estimated"
                : "No data"
            }
            gradient="from-violet-500 to-purple-600"
          />
          <StatCard
            icon={<IoCheckmarkDoneCircle className="w-5 h-5" />}
            label={t("overall_rating")}
            value={stats?.overallRating ? `${stats.overallRating}` : "—"}
            sub={ratingCfg?.label ?? "No rating"}
            gradient={ratingCfg ? ratingCfg.gradient : "from-gray-400 to-gray-500"}
          />
        </div>

        {/* ── Monthly Trend Chart ───────────────────────────────────────── */}
        {stats?.monthlyTrend && <MonthlyTrendChart data={stats.monthlyTrend} />}

        {/* ── Rating Breakdown ──────────────────────────────────────────── */}
        {stats && stats.ratedTasksCount > 0 && (
          <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
                <FiAward className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                  {t("rating_distribution")}
                </h3>
                <p className="text-xs text-gray-400">
                  {t("based_on")} {stats.ratedTasksCount} {t("rated_task")}
                  {stats.ratedTasksCount !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[String(star) as "1" | "2" | "3" | "4" | "5"] || 0;
                const pct = stats.ratedTasksCount > 0 ? (count / stats.ratedTasksCount) * 100 : 0;
                const starCfg = getRatingConfig(star);
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="flex items-center gap-1 w-12 shrink-0 justify-end">
                      <span className="text-xs font-bold text-gray-500 tabular-nums">{star}</span>
                      <HiStar className="w-3 h-3 text-amber-400" />
                    </div>
                    <div className="flex-1 h-2 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${starCfg.bar} rounded-full transition-all duration-700 ease-out`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 w-16 shrink-0 justify-end">
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-200 tabular-nums">{count}</span>
                      <span className="text-xs text-gray-300 dark:text-gray-600">/</span>
                      <span className="text-xs text-gray-400 tabular-nums">{Math.round(pct)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-gray-700">
              {[
                { label: "Rated", value: stats.ratedTasksCount, cls: "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" },
                { label: "Overdue", value: stats.overdueTasksCount, cls: "bg-rose-50 dark:bg-rose-900/20 text-rose-500" },
                { label: "On Time", value: stats.onTimeTasksCount, cls: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
              ].map((p) => (
                <span key={p.label} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${p.cls}`}>
                  <span className="font-black tabular-nums">{p.value}</span>
                  {p.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Task List ─────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-700">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                  <IoTrendingUp className="w-4 h-4 text-indigo-500" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-gray-800 dark:text-white">
                    {t("task_history_reviews")}
                  </h2>
                  <p className="text-xs text-gray-400">
                    {tasks.length} {t("of")} {totalTasks} {t("tasks_loaded")}
                  </p>
                </div>
              </div>

              {totalTasks > 0 && (
                <div className="flex items-center gap-2.5">
                  <div className="w-28 h-1.5 bg-slate-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                      style={{ width: `${loadedPct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-400 tabular-nums">{loadedPct}%</span>
                </div>
              )}
            </div>
          </div>

          <div className={`p-5 transition-opacity ${isFilterLoading ? "opacity-40 pointer-events-none" : ""}`}>
            {tasks.length === 0 ? (
              <div className="text-center py-20 space-y-4">
                <div className="w-16 h-16 bg-slate-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center mx-auto">
                  <BsClipboardCheck className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                </div>
                <div>
                  <p className="text-base font-bold text-gray-400">{t("no_tasks_found")}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {hasActiveFilters
                      ? t("no_tasks_match_filters") || "No tasks match your current filters"
                      : t("this_user_has_no_task_reviews")}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task, index) => (
                  <TaskCard key={task._id} task={task} index={index} />
                ))}
              </div>
            )}

            <div ref={loadMoreRef} className="w-full pt-6 flex justify-center items-center min-h-[60px]">
              {isFetchingMore && (
                <div className="flex items-center gap-2.5 px-5 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-full">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {t("loading_more_tasks")}
                  </span>
                </div>
              )}
              {!isFetchingMore && page >= totalPages && tasks.length > 0 && (
                <div className="flex items-center gap-4 w-full max-w-xs mx-auto">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent to-slate-200 dark:to-gray-700" />
                  <span className="text-xs font-semibold text-gray-400 whitespace-nowrap">
                    {t("all_tasks_loaded")}
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-l from-transparent to-slate-200 dark:to-gray-700" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}