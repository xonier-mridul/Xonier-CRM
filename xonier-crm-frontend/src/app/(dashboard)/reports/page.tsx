"use client";

import React, { JSX, useState, useEffect, useCallback, useRef } from "react";
import { TaskReportService } from "@/src/services/taskReport.service";
import type { TaskReport, TaskReportStatus } from "@/src/types/task/taskReport";
import { MdDelete } from "react-icons/md";
import Link from "next/link";
import { toast } from "react-toastify";
import DateFilterButton from "@/src/components/common/dateFilter";
import { DateFilter } from "@/src/types/components/ui/dateFilter.types";

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; dot: string; bg: string; text: string }> = {
  morning_pending: {
    label: "Morning Pending",
    dot: "bg-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    text: "text-amber-700 dark:text-amber-400",
  },
  morning_submitted: {
    label: "Morning Done",
    dot: "bg-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    text: "text-blue-700 dark:text-blue-400",
  },
  evening_pending: {
    label: "Evening Pending",
    dot: "bg-orange-400",
    bg: "bg-orange-50 dark:bg-orange-900/20",
    text: "text-orange-700 dark:text-orange-400",
  },
  evening_submitted: {
    label: "Evening Done",
    dot: "bg-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  reviewed: {
    label: "Reviewed",
    dot: "bg-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
    text: "text-purple-700 dark:text-purple-400",
  },
};

const MOOD_EMOJI: Record<string, string> = {
  excellent: "🚀",
  good: "😊",
  neutral: "😐",
  tired: "😴",
  stressed: "😰",
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400",
  high: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  medium: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
  low: "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400",
};

function StatusBadge({ status }: { status: string }) {
  const m = STATUS_META[status] ?? {
    label: status,
    dot: "bg-gray-400",
    bg: "bg-gray-50 dark:bg-gray-700",
    text: "text-gray-600 dark:text-gray-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${m.bg} ${m.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const r = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct === 100 ? "#10b981" : pct >= 50 ? "#3b82f6" : "#f59e0b";
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" className="shrink-0">
      <circle cx="20" cy="20" r={r} fill="none" stroke="currentColor" strokeWidth="3" className="text-gray-100 dark:text-gray-700" />
      <circle
        cx="20" cy="20" r={r} fill="none" stroke={color} strokeWidth="3"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 20 20)"
        style={{ transition: "stroke-dashoffset 0.6s ease" }}
      />
      <text x="20" y="24" textAnchor="middle" fontSize="9" fontWeight="700" fill={color}>{pct}%</text>
    </svg>
  );
}
const handleDelete = (id: string) => async () => {
  if (!confirm("Are you sure you want to delete this report? This action cannot be undone.")) return;
  try {
    const res = await TaskReportService.deleteReport(id);
    if (res.status === 200) {
      toast.success("Report deleted");
    }
  } catch {
    toast.error("Failed to delete report");
  }
};
function ExpandableRow({ report }: { report: TaskReport }) {
  const [open, setOpen] = useState(false);
  const morningItems = report.morningAgenda?.items ?? [];
  const completedItems = report.eveningReport?.completedItems ?? [];
  const pendingItems = report.eveningReport?.pendingItems ?? [];
  const totalEst = morningItems.reduce((s, i) => s + (i.estimatedHours ?? 0), 0);
  const totalActual = completedItems.reduce((s, i) => s + (i.actualHours ?? 0), 0);
  const user = report.user;
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <>
      <tr
        className="text-nowrap border-b border-gray-50 dark:border-gray-700/60 hover:bg-slate-50/60 dark:hover:bg-gray-700/30 transition-colors cursor-pointer group"
        onClick={() => setOpen(o => !o)}
      >
        {/* User */}
        <Link
          href={`/report/create/${report.user.id}`}>
          <td className="px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-xs font-extrabold shrink-0 shadow-sm">
                {initials}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">{user?.company ?? "—"}</p>
              </div>
            </div>
          </td>
        </Link>

        {/* Date */}
        <td className="px-5 py-4">
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-900 dark:text-white">
              {new Date(report.reportDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              {new Date(report.reportDate).toLocaleDateString("en-GB", { weekday: "long" })}
            </span>
          </div>
        </td>

        {/* Status */}
        <td className="px-5 py-4"><StatusBadge status={report.status} /></td>

        {/* Tasks */}
        <td className="px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-gray-900 dark:text-white">{morningItems.length}</span>
            <span className="text-xs text-gray-400">planned</span>
            <span className="text-gray-200 dark:text-gray-600">|</span>
            <span className="text-sm font-extrabold text-emerald-600">{completedItems.length}</span>
            <span className="text-xs text-gray-400">done</span>
          </div>
        </td>

        {/* Hours */}
        <td className="px-5 py-4">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-12">Est.</span>
              <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-400 rounded-full" style={{ width: `${Math.min((totalEst / 8) * 100, 100)}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{totalEst.toFixed(1)}h</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-gray-400 w-12">Actual</span>
              <div className="h-1.5 w-24 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${Math.min((totalActual / 8) * 100, 100)}%` }} />
              </div>
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{totalActual.toFixed(1)}h</span>
            </div>
          </div>
        </td>

        {/* Mood */}
        <td className="px-5 py-4">
          {report.eveningReport?.overallMood ? (
            <span className="text-xl" title={report.eveningReport.overallMood}>
              {MOOD_EMOJI[report.eveningReport.overallMood] ?? "—"}
            </span>
          ) : (
            <span className="text-gray-300 dark:text-gray-600 text-sm">—</span>
          )}
        </td>

        {/* Reviewed */}
        <td className="px-5 py-4">
          {report.isReviewed ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> Reviewed
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-400 dark:bg-gray-700 dark:text-gray-500">
              Pending
            </span>
          )}
        </td>

        {/* Expand */}
        <td className="px-5 py-4">
          <button
            type="button"
            className="w-7 h-7 rounded-lg flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: open ? "rotate(180deg)" : "", transition: "transform .2s" }}>
              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </td>
        <td className="justify-center px-5 py-4 text-center">
          <button
            onClick={handleDelete(report.id)}
          >
            <MdDelete className="w-5 h-5 text-red-500 hover:text-red-700 transition-colors" />
          </button>
        </td>
      </tr>

      {/* Expanded details */}
      {open && (
        <tr className="bg-slate-50/80 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-700">
          <td colSpan={8} className="px-6 py-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

              {/* Morning Agenda */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌅</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Morning Agenda</h4>
                  {report.morningAgenda?.goals && (
                    <span className="ml-auto text-xs text-gray-500 dark:text-gray-400 italic max-w-[200px] truncate">
                      "{report.morningAgenda.goals}"
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  {morningItems.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">No items planned</p>
                  ) : morningItems.map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                      <ProgressRing pct={item.completionPercentage} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{item.title}</span>
                          {item.priority && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${PRIORITY_BADGE[item.priority] ?? PRIORITY_BADGE.low}`}>
                              {item.priority}
                            </span>
                          )}
                          {item.linkedTaskId && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
                              {item.linkedTaskId}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-gray-400">⏱ Est: <b className="text-gray-600 dark:text-gray-300">{item.estimatedHours ?? "—"}h</b></span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evening Report */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🌆</span>
                  <h4 className="text-sm font-extrabold text-gray-900 dark:text-white">Evening Report</h4>
                  {report.eveningReport?.overallMood && (
                    <span className="ml-auto text-base">{MOOD_EMOJI[report.eveningReport.overallMood]}</span>
                  )}
                </div>

                {report.eveningReport?.isSubmitted ? (
                  <div className="space-y-3">
                    {/* Achievements */}
                    {report.eveningReport.achievements && (
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800">
                        <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider mb-1">🏆 Achievements</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{report.eveningReport.achievements}</p>
                      </div>
                    )}
                    {/* Blockers */}
                    {report.eveningReport.blockers && (
                      <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
                        <p className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">🚧 Blockers</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{report.eveningReport.blockers}</p>
                      </div>
                    )}
                    {/* Tomorrow Plan */}
                    {report.eveningReport.tomorrowPlan && (
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-1">📅 Tomorrow's Plan</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300">{report.eveningReport.tomorrowPlan}</p>
                      </div>
                    )}
                    {/* Pending items count */}
                    {pendingItems.length > 0 && (
                      <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 font-semibold">
                        <span>⏳</span> {pendingItems.length} task(s) carried forward
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-28 text-gray-300 dark:text-gray-600">
                    <span className="text-3xl mb-2">🌙</span>
                    <p className="text-xs font-semibold">Evening report not submitted yet</p>
                  </div>
                )}
              </div>

              {/* Manager comment */}
              {report.managerComment && (
                <div className="lg:col-span-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 flex items-start gap-2">
                  <span className="text-base shrink-0">💬</span>
                  <div>
                    <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-0.5">Manager Comment</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300">{report.managerComment}</p>
                  </div>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-b border-gray-50 dark:border-gray-700/60">
      {Array.from({ length: 8 }).map((_, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 bg-gray-100 dark:bg-gray-700 rounded-lg ${i === 0 ? "w-32" : i === 1 ? "w-20" : "w-16"}`} />
        </td>
      ))}
    </tr>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TaskReportListPage = (): JSX.Element => {
  const [reports, setReports] = useState<TaskReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterStatus, setFilterStatus] = useState("");
  const [search, setSearch] = useState("");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const today = new Date().toISOString().split("T")[0];

  const [dateFilter, setDateFilter] = useState<DateFilter>({
    fromDate: today,
    toDate: today,
  });
  const fetchReports = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await TaskReportService.getAll({
        page: currentPage,
        limit: 10,
        search: search || undefined,
        status: filterStatus as TaskReportStatus || undefined,
        fromDate: dateFilter.fromDate || undefined,
        toDate: dateFilter.toDate || undefined,
      });
      if (res.status === 200) {
        const d = res.data.data;
        setReports(d.data);
        setTotalPages(d.totalPages);
      }
    } catch {
      // handle silently
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, filterStatus, dateFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  const handleSearch = (val: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setCurrentPage(1);
    }, 500);
  };
  

  // Stats
  const totalReports = reports.length;
  const reviewed = reports.filter(r => r.isReviewed).length;
  const eveningDone = reports.filter(r =>
    r.status === "evening_submitted" || r.status === "reviewed"
  ).length;
  const avgCompletion = reports.length
    ? Math.round(
      reports.reduce((sum, r) => {
        const items = r.morningAgenda?.items ?? [];
        if (!items.length) return sum;
        return sum + items.reduce((s, i) => s + i.completionPercentage, 0) / items.length;
      }, 0) / reports.length
    )
    : 0;

  return (
    <div className="ml-72 mt-14">
      <div className="bg-white dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full mb-10">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-2xl">📋</span>
              <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight">
                Task Reports
              </h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Daily task reports — morning agendas &amp; evening progress
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* <a
              href="/reports/create/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all active:scale-95 shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              New Report
            </a> */}
            <button
              type="button"
              onClick={fetchReports}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-white text-sm font-bold transition-all active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className={isLoading ? "animate-spin" : ""}>
                <path d="M13 7A6 6 0 1 1 7 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M10 1h3v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div className="grid grid-cols-4 gap-4 mb-7">
          {[
            { label: "Total (Page)", value: totalReports, icon: "📋", bg: "bg-blue-50 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800" },
            { label: "Evening Submitted", value: eveningDone, icon: "🌆", bg: "bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800" },
            { label: "Reviewed", value: reviewed, icon: "✅", bg: "bg-purple-50 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800" },
            { label: "Avg Completion", value: `${avgCompletion}%`, icon: "📊", bg: "bg-amber-50 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800" },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-3 p-4 rounded-2xl border ${s.bg}`}>
              <span className="text-xl">{s.icon}</span>
              <div>
                <div className="text-xl font-extrabold text-gray-900 dark:text-white">{s.value}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="relative min-w-[240px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by employee name…"
              className="pl-9 pr-4 py-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
            />
          </div>

          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition"
          >
            <option value="">All Statuses</option>
            <option value="morning_pending">🌅 Morning Pending</option>
            <option value="morning_submitted">📝 Morning Submitted</option>
            <option value="evening_pending">🌆 Evening Pending</option>
            <option value="evening_submitted">✅ Evening Submitted</option>
            <option value="reviewed">💬 Reviewed</option>
          </select>
          <DateFilterButton dateFilter={dateFilter} onChange={setDateFilter} />

          {(search || filterStatus || dateFilter.fromDate || dateFilter.toDate) && (
            <button
              type="button"
              onClick={() => { setSearch(""); setFilterStatus(""); setCurrentPage(1); setDateFilter({ fromDate: "", toDate: "" }); }}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition flex items-center gap-1.5"
            >
              <span>✕</span> Clear
            </button>
          )}
        </div>

        {/* ── Table ── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[900px]">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  {["Employee", "Date", "Status", "Tasks", "Hours", "Mood", "Reviewed", "", "Action"].map(col => (
                    <th key={col} className="px-5 py-3.5 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-left">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
                  : reports.length === 0
                    ? (
                      <tr>
                        <td colSpan={8} className="text-center py-20">
                          <div className="text-5xl mb-3">📭</div>
                          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No task reports found</p>
                        </td>
                      </tr>
                    )
                    : reports.map(r => <ExpandableRow key={r.id} report={r} />)
                }
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-5 py-3.5 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Page <span className="font-semibold text-gray-600 dark:text-gray-300">{currentPage}</span> of{" "}
              <span className="font-semibold text-gray-600 dark:text-gray-300">{totalPages}</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1 || isLoading}
                onClick={() => setCurrentPage(p => p - 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Prev
              </button>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 px-1">{currentPage}</span>
              <button
                type="button"
                disabled={currentPage >= totalPages || isLoading}
                onClick={() => setCurrentPage(p => p + 1)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskReportListPage;