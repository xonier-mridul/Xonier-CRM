"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import api from "@/src/lib/axios";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  ExternalLink,
  Mail,
  MessageCircle,
  Phone,
  RefreshCw,
  User,
  Video,
  CheckSquare,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";

export interface DashboardNextAction {
  id: string;
  entityType: "lead" | "deal";
  entityId: string;
  entityName: string;
  entityCode?: string;
  entitySubtext?: string;
  kind: "call" | "email" | "meeting" | "task" | "whatsapp" | "other" | string;
  title: string;
  dueAt: string;
  ownerId: string;
  ownerName: string;
  createdByName?: string;
  completedAt: string | null;
  createdAt: string;
  isOverdue: boolean;
  isDueToday: boolean;
}

interface NextActionsSummary {
  totalPending: number;
  overdueCount: number;
  dueTodayCount: number;
  timezone: string;
  canViewTeam: boolean;
}

type UrgencyTab = "all" | "overdue" | "today" | "upcoming";

const KIND_META: Record<
  string,
  { label: string; Icon: React.ComponentType<{ className?: string }>; badgeClass: string }
> = {
  call: {
    label: "Call",
    Icon: Phone,
    badgeClass:
      "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/20",
  },
  email: {
    label: "Email",
    Icon: Mail,
    badgeClass:
      "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/20",
  },
  meeting: {
    label: "Meeting",
    Icon: Video,
    badgeClass:
      "bg-violet-50 text-violet-700 border-violet-200/80 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/20",
  },
  task: {
    label: "Task",
    Icon: CheckSquare,
    badgeClass:
      "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20",
  },
  whatsapp: {
    label: "WhatsApp",
    Icon: MessageCircle,
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20",
  },
  other: {
    label: "Action",
    Icon: Clock,
    badgeClass:
      "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  },
};

function formatDueDate(iso: string, tz: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  try {
    return date.toLocaleString(undefined, {
      timeZone: tz,
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return date.toLocaleString();
  }
}

export default function NextActionsCard() {
  const [actions, setActions] = useState<DashboardNextAction[]>([]);
  const [summary, setSummary] = useState<NextActionsSummary>({
    totalPending: 0,
    overdueCount: 0,
    dueTodayCount: 0,
    timezone: "UTC",
    canViewTeam: false,
  });
  const [statusFilter, setStatusFilter] = useState<"pending" | "completed">("pending");
  const [scopeFilter, setScopeFilter] = useState<"all" | "mine">("all");
  const [urgencyTab, setUrgencyTab] = useState<UrgencyTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        const res = await api.get<{
          data: DashboardNextAction[];
          summary: NextActionsSummary;
        }>("/next-action/upcoming", {
          params: {
            status: statusFilter,
            scope: scopeFilter,
            limit: 150,
          },
        });
        setActions(res.data?.data ?? []);
        if (res.data?.summary) {
          setSummary(res.data.summary);
        }
      } catch {
        setError("Could not load scheduled next actions.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, scopeFilter]
  );

  useEffect(() => {
    void fetchActions();
  }, [fetchActions]);

  const handleComplete = async (action: DashboardNextAction) => {
    try {
      setCompletingId(action.id);
      await api.patch(
        `/next-action/${action.entityType}/${action.entityId}/${action.id}/complete`
      );
      await fetchActions(true);
    } catch {
      setError("Could not mark action as completed.");
    } finally {
      setCompletingId(null);
    }
  };

  const filteredActions = useMemo(() => {
    return actions.filter((a) => {
      if (statusFilter === "pending") {
        if (urgencyTab === "overdue" && !a.isOverdue) return false;
        if (urgencyTab === "today" && !a.isDueToday) return false;
        if (urgencyTab === "upcoming" && (a.isOverdue || a.isDueToday)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = a.title?.toLowerCase().includes(q);
        const matchEntity = a.entityName?.toLowerCase().includes(q);
        const matchOwner = a.ownerName?.toLowerCase().includes(q);
        const matchKind = a.kind?.toLowerCase().includes(q);
        const matchSub = a.entitySubtext?.toLowerCase().includes(q);
        if (!matchTitle && !matchEntity && !matchOwner && !matchKind && !matchSub) {
          return false;
        }
      }
      return true;
    });
  }, [actions, statusFilter, urgencyTab, searchQuery]);

  const upcomingCount = Math.max(
    0,
    summary.totalPending - summary.overdueCount - summary.dueTodayCount
  );

  return (
    <div className="bg-white dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 flex flex-col justify-between h-full">
      {/* Top Header */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-200/70 dark:border-cyan-500/20 flex items-center justify-center flex-shrink-0 shadow-2xs">
              <CalendarClock className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white tracking-tight truncate">
                  Scheduled Next Actions
                </h3>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-50 text-cyan-700 border border-cyan-200/80 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/20 tabular-nums">
                  {summary.totalPending}
                </span>
                {summary.overdueCount > 0 && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/80 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/20 tabular-nums">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {summary.overdueCount} overdue
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                Lead &amp; deal follow-ups · {summary.timezone}
              </p>
            </div>
          </div>

          {/* Compact Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {summary.canViewTeam && (
              <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/70 dark:border-slate-700/70">
                <button
                  type="button"
                  onClick={() => setScopeFilter("all")}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                    scopeFilter === "all"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  type="button"
                  onClick={() => setScopeFilter("mine")}
                  className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                    scopeFilter === "mine"
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Mine
                </button>
              </div>
            )}

            <div className="inline-flex rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 border border-slate-200/70 dark:border-slate-700/70">
              <button
                type="button"
                onClick={() => {
                  setStatusFilter("pending");
                  setUrgencyTab("all");
                }}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === "pending"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Pending
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("completed")}
                className={`px-2 py-0.5 text-[10px] font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === "completed"
                    ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                }`}
              >
                Done
              </button>
            </div>

            <button
              type="button"
              onClick={() => void fetchActions(true)}
              disabled={refreshing}
              title="Refresh next actions"
              aria-label="Refresh next actions"
              className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700/70 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Sub-toolbar: Quick Filter Pills + Compact Search (scales for 20+ items) */}
        <div className="flex items-center justify-between gap-2 mb-3">
          {statusFilter === "pending" ? (
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {(
                [
                  { id: "all", label: "All", count: summary.totalPending },
                  { id: "overdue", label: "Overdue", count: summary.overdueCount },
                  { id: "today", label: "Today", count: summary.dueTodayCount },
                  { id: "upcoming", label: "Upcoming", count: upcomingCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setUrgencyTab(tab.id)}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                    urgencyTab === tab.id
                      ? tab.id === "overdue"
                        ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                        : "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/15 dark:text-cyan-300 dark:border-cyan-500/30"
                      : "bg-slate-50 text-slate-500 border-slate-200/70 hover:text-slate-800 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700/60"
                  }`}
                >
                  {tab.label}
                  <span className="opacity-75 tabular-nums">({tab.count})</span>
                </button>
              ))}
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">Recently completed actions</span>
          )}

          {/* Compact Search Box */}
          <div className="relative w-36 sm:w-44 flex-shrink-0">
            <Search className="w-3 h-3 text-slate-400 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search action / lead…"
              className="w-full pl-6 pr-5 py-1 text-[11px] rounded-lg border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-cyan-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">{error}</p>
        )}

        {/* Fixed-Height Scrollable Container — Card height NEVER grows with 10-50+ items */}
        <div className="h-[225px] overflow-y-auto pr-1 space-y-1.5">
          {loading ? (
            <div className="space-y-2 py-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/70 animate-pulse"
                />
              ))}
            </div>
          ) : filteredActions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-1.5 text-center">
              <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                <CalendarClock className="w-4.5 h-4.5 opacity-60" />
              </div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {searchQuery
                  ? "No matching next actions found."
                  : statusFilter === "pending"
                  ? "No pending next actions in this view."
                  : "No completed next actions yet."}
              </p>
            </div>
          ) : (
            filteredActions.map((action) => {
              const meta = KIND_META[action.kind] ?? KIND_META.other;
              const KindIcon = meta.Icon;
              const entityHref =
                action.entityType === "lead"
                  ? `/leads/view/${action.entityId}`
                  : `/deals/view/${action.entityId}`;

              return (
                <div
                  key={action.id}
                  className={`flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl border transition-all ${
                    action.isOverdue
                      ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/50"
                      : action.isDueToday
                      ? "bg-amber-50/35 dark:bg-amber-950/15 border-amber-200/80 dark:border-amber-900/40"
                      : "bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/70 dark:border-slate-700/60 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div
                      className={`w-7 h-7 rounded-lg border flex items-center justify-center flex-shrink-0 ${meta.badgeClass}`}
                      title={meta.label}
                    >
                      <KindIcon className="w-3.5 h-3.5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      {/* Line 1: Action Title + Type + Status Badge */}
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {action.title}
                        </p>
                        <span
                          className={`text-[9px] font-semibold px-1.5 py-0.2 rounded-full border capitalize flex-shrink-0 ${meta.badgeClass}`}
                        >
                          {meta.label}
                        </span>
                        {action.completedAt ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/20 flex-shrink-0">
                            Done
                          </span>
                        ) : action.isOverdue ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30 flex-shrink-0">
                            Overdue
                          </span>
                        ) : action.isDueToday ? (
                          <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/30 flex-shrink-0">
                            Today
                          </span>
                        ) : null}
                      </div>

                      {/* Line 2: Entity Link + Owner + Due Time */}
                      <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        <Link
                          href={entityHref}
                          className="inline-flex items-center gap-1 font-medium text-cyan-700 hover:text-cyan-800 dark:text-cyan-400 dark:hover:text-cyan-300 hover:underline truncate max-w-[150px]"
                        >
                          <span className="uppercase text-[9px] font-bold px-1 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                            {action.entityType}
                          </span>
                          <span className="truncate">{action.entityName}</span>
                          <ExternalLink className="w-2.5 h-2.5 flex-shrink-0" />
                        </Link>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span className="inline-flex items-center gap-0.5 truncate max-w-[110px]">
                          <User className="w-2.5 h-2.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{action.ownerName || "Unassigned"}</span>
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <span
                          className={`inline-flex items-center gap-0.5 font-medium flex-shrink-0 ${
                            action.isOverdue
                              ? "text-rose-600 dark:text-rose-400"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <Clock className="w-2.5 h-2.5" />
                          {formatDueDate(action.dueAt, summary.timezone)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Compact Complete Button */}
                  {!action.completedAt && (
                    <button
                      type="button"
                      disabled={completingId === action.id}
                      onClick={() => void handleComplete(action)}
                      title="Mark action as completed"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300 dark:hover:border-emerald-500/30 transition-colors disabled:opacity-50 cursor-pointer flex-shrink-0"
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>{completingId === action.id ? "…" : "Done"}</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer status bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>
          Showing {filteredActions.length} of {actions.length} actions
        </span>
        {filteredActions.length > 4 && (
          <span>Scroll inside list for more ↓</span>
        )}
      </div>
    </div>
  );
}
