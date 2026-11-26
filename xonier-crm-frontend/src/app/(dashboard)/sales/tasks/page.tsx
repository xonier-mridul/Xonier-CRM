"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/src/store";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  ListTodo,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  User,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { LeadEngagementStatus, PERMISSIONS } from "@/src/constants/enum";
import { usePermissions } from "@/src/hooks/usePermissions";
import LeadService from "@/src/services/lead.service";
import StatusDropdown from "@/src/components/pages/lead/StatusDropdown";
import { subscribeToLeadEngagementUpdates } from "@/src/app/utils/leadEngagementUpdates";
import SalesTaskService, { type SalesTask, type SalesTaskStatus } from "@/src/services/sales-task.service";
import extractErrorMessages from "@/src/app/utils/error.utils";

const pageSize = 25;
const dateInputClass = "mt-1.5 block w-full min-w-32 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 shadow-sm shadow-slate-900/[0.02] outline-none transition hover:border-slate-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-800/90 dark:text-slate-100 dark:hover:border-slate-600";
const calendar = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" });
const displayDate = new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" });
const isoDate = (date: Date) => date.toISOString().slice(0, 10);
const presets = [
  ["work", "Due today + overdue"],
  ["today", "Today"],
  ["yesterday", "Yesterday"],
  ["week", "This week"],
  ["all", "All dates"],
  ["custom", "Custom range"],
] as const;
type Preset = (typeof presets)[number][0];

const AVATAR_PALETTES = [
  { bg: "bg-gradient-to-br from-teal-500 to-emerald-600", ring: "ring-teal-500/20", lightBg: "bg-teal-50 text-teal-700 border-teal-200/80 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800/60" },
  { bg: "bg-gradient-to-br from-indigo-500 to-violet-600", ring: "ring-indigo-500/20", lightBg: "bg-indigo-50 text-indigo-700 border-indigo-200/80 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60" },
  { bg: "bg-gradient-to-br from-sky-500 to-blue-600", ring: "ring-sky-500/20", lightBg: "bg-sky-50 text-sky-700 border-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800/60" },
  { bg: "bg-gradient-to-br from-amber-500 to-orange-600", ring: "ring-amber-500/20", lightBg: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60" },
  { bg: "bg-gradient-to-br from-rose-500 to-pink-600", ring: "ring-rose-500/20", lightBg: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60" },
  { bg: "bg-gradient-to-br from-cyan-500 to-teal-600", ring: "ring-cyan-500/20", lightBg: "bg-cyan-50 text-cyan-700 border-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:border-cyan-800/60" },
];

function getAvatarPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function dateBounds(preset: Preset) {
  const parts = calendar.formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find(part => part.type === type)?.value);
  const today = new Date(Date.UTC(value("year"), value("month") - 1, value("day")));
  if (preset === "today") return { dateFrom: isoDate(today), dateTo: isoDate(today) };
  if (preset === "yesterday") {
    today.setUTCDate(today.getUTCDate() - 1);
    return { dateFrom: isoDate(today), dateTo: isoDate(today) };
  }
  if (preset === "week") {
    today.setUTCDate(today.getUTCDate() - (today.getUTCDay() + 6) % 7);
    const dateFrom = isoDate(today);
    today.setUTCDate(today.getUTCDate() + 6);
    return { dateFrom, dateTo: isoDate(today) };
  }
  return {};
}

export default function SalesTasksPage() {
  const { hasPermission } = usePermissions();
  const canUpdateEngagement = hasPermission(PERMISSIONS.updateLead);
  const [agent, setAgent] = useState<{ id: string; name: string } | null>(null);
  const [search, setSearch] = useState("");
  const [team, setTeam] = useState(false);
  const userRoles = useSelector((state: RootState) => state.auth?.user?.userRole || []);
  const isAdminOrManager = userRoles.some(role => {
    const r = role as Omit<typeof role, "status"> & { status?: string | boolean; deletedAt?: string | null };
    return (
      Boolean(r?.code) &&
      r.status !== false &&
      r.status !== "inactive" &&
      !r.deletedAt &&
      (["SUPER_ADMIN", "COMPANY_ADMIN", "ADMIN", "MANAGER"].includes(r.code) ||
        (r.code !== "USER" && r.canManageBelow === true))
    );
  });
  const canViewTeam = hasPermission(PERMISSIONS.assignLead) && isAdminOrManager;
  const isTeamView = canViewTeam && team;
  const [preset, setPreset] = useState<Preset>("work");
  const [dateField, setDateField] = useState<"assignedAt" | "dueDate">("dueDate");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<SalesTaskStatus | "">("");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [loaded, setLoaded] = useState<{
    key: string;
    data?: { items: SalesTask[]; total: number };
    error?: string;
  }>();
  const [actionError, setActionError] = useState("");
  const [completing, setCompleting] = useState("");

  const requestKey = JSON.stringify([agent, search, isTeamView, dateField, dateFrom, dateTo, page, preset, refresh, status]);
  const invalidRange = preset === "custom" && !!dateFrom && !!dateTo && dateFrom > dateTo;
  const current = loaded?.key === requestKey ? loaded : undefined;
  const result = current?.data;
  const error = invalidRange ? "Start date must be on or before end date." : current?.error;

  useEffect(() => {
    if (invalidRange) return;
    const controller = new AbortController();
    const bounds = preset === "custom"
      ? { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
      : dateBounds(preset);
    SalesTaskService.list({
      ...bounds, team: isTeamView, assigneeId: isTeamView ? agent?.id : undefined, search: isTeamView && !agent ? search : undefined, dateField, dueToday: preset === "work", status: status || undefined, page,
    }, controller.signal)
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (page > 1 && !data.data.items.length) setPage(Math.max(1, Math.ceil(data.data.total / pageSize)));
        else setLoaded({ key: requestKey, data: data.data });
      })
      .catch(error => {
        if (!controller.signal.aborted) setLoaded({ key: requestKey, error: extractErrorMessages(error).join(" ") });
      });
    return () => controller.abort();
  }, [agent, search, isTeamView, dateField, dateFrom, dateTo, invalidRange, page, preset, requestKey, status]);

  useEffect(() => subscribeToLeadEngagementUpdates(() => setRefresh(value => value + 1)), []);

  const updateEngagement = async (leadId: string, newStatus: LeadEngagementStatus, followUpIn?: string) => {
    setActionError("");
    try {
      await LeadService.updateEngagementStatus(leadId, {
        status: newStatus,
        ...(followUpIn ? { followUpIn } : {}),
      });
      setRefresh(value => value + 1);
      toast.success("Lead engagement updated");
    } catch (error) {
      setActionError(extractErrorMessages(error).join(" "));
    }
  };

  const markComplete = async (id: string) => {
    setCompleting(id);
    setActionError("");
    try {
      await SalesTaskService.complete(id);
      setRefresh(value => value + 1);
    } catch (error) {
      setActionError(extractErrorMessages(error).join(" "));
    } finally {
      setCompleting("");
    }
  };

  const isTeamOverview = isTeamView && !agent;
  const teamStats = isTeamOverview && result?.items ? result.items.reduce(
    (acc, member) => {
      acc.total += member.taskCount ?? 0;
      acc.pending += member.pending ?? 0;
      acc.completed += member.completed ?? 0;
      acc.overdue += member.overdue ?? 0;
      return acc;
    },
    { total: 0, pending: 0, completed: 0, overdue: 0 }
  ) : null;
  const teamCompletionRate = teamStats && teamStats.total > 0
    ? Math.round((teamStats.completed / teamStats.total) * 100)
    : 0;

  const taskStats = !isTeamOverview && result?.items ? result.items.reduce(
    (acc, task) => {
      acc.total += 1;
      if (task.status === "completed") acc.completed += 1;
      else {
        acc.pending += 1;
        const due = new Date(task.dueDate);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (due < now) acc.overdue += 1;
      }
      return acc;
    },
    { total: 0, pending: 0, completed: 0, overdue: 0 }
  ) : null;

  const hasActiveFilters = preset !== "work" || dateField !== "dueDate" || status !== "" || search.trim() !== "";

  const resetFilters = () => {
    setPreset("work");
    setDateField("dueDate");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    setSearch("");
    setPage(1);
  };

  return (
    <section className="mx-auto max-w-[1440px] space-y-6 px-1 pb-8">
      {/* Premium Hero Header */}
      <header className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-teal-50/40 p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6 dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-teal-950/20">
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-gradient-to-br from-teal-400/10 to-cyan-400/5 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-13 w-13 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-md shadow-teal-600/20 ring-4 ring-teal-500/10">
              <ListTodo size={24} strokeWidth={2} />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[26px] dark:text-white">
                  Sales tasks
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-teal-200/70 bg-teal-50/80 px-2.5 py-0.5 text-[11px] font-semibold text-teal-700 dark:border-teal-800/60 dark:bg-teal-950/60 dark:text-teal-300">
                  <Sparkles size={11} /> Follow-up Hub
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                {canViewTeam ? "Your assigned lead follow-ups, team workload, and daily execution in one place." : "Your assigned lead follow-ups and daily execution in one place."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {canViewTeam && (
              <div
                className="inline-flex items-center gap-1 rounded-xl border border-slate-200/90 bg-slate-100/80 p-1 shadow-inner dark:border-slate-700/80 dark:bg-slate-800/80"
                aria-label="Task view"
              >
                {([
                  [false, "My tasks", UserCheck],
                  [true, "My team", Users],
                ] as const).map(([value, label, Icon]) => {
                  const active = team === value;
                  return (
                    <button
                      key={String(value)}
                      type="button"
                      aria-pressed={active}
                      onClick={() => {
                        setTeam(value);
                        setAgent(null);
                        setPage(1);
                      }}
                      className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                        active
                          ? "bg-white text-teal-700 shadow-sm shadow-slate-900/5 ring-1 ring-slate-200/70 dark:bg-slate-900 dark:text-teal-300 dark:ring-slate-700"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                      }`}
                    >
                      <Icon size={15} className={active ? "text-teal-600 dark:text-teal-400" : "text-slate-400"} />
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            <Link
              href="/leads"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm shadow-slate-900/[0.03] transition hover:-translate-y-0.5 hover:border-teal-300 hover:bg-teal-50/50 hover:text-teal-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-700 dark:hover:bg-teal-950/40"
            >
              Go to Leads <ArrowUpRight size={16} className="text-teal-600 dark:text-teal-400" />
            </Link>
          </div>
        </div>
      </header>

      {/* Team Context Bar & Search */}
      {isTeamView && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white px-5 py-4 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900">
          {agent ? (
            <div className="flex flex-wrap items-center gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setAgent(null);
                  setPage(1);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-teal-700"
              >
                <ArrowLeft size={14} /> All team members
              </button>
              <div className="h-5 w-px bg-slate-200 dark:bg-slate-700" />
              <div className="flex items-center gap-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold text-white shadow-sm ${getAvatarPalette(agent.name).bg}`}>
                  {agent.name.trim().split(/\s+/).map(part => part[0]).slice(0, 2).join("").toUpperCase()}
                </span>
                <div>
                  <h2 className="text-base font-bold text-slate-900 dark:text-white">{agent.name}’s tasks</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View only · Inspecting assigned lead engagement and task progress</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-300">
                <Users size={20} />
              </span>
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white">Team overview</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Choose a team member below to review their assigned follow-ups and completion rate.
                </p>
              </div>
            </div>
          )}

          {!agent && (
            <div className="relative min-w-[260px] flex-1 sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                aria-label="Search team members"
                placeholder="Search team members…"
                value={search}
                onChange={event => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-slate-200/90 bg-slate-50/70 py-2.5 pl-10 pr-9 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-500/15 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100 dark:focus:bg-slate-800"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Summary KPI Strip */}
      {result && result.items.length > 0 && (
        <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
          {isTeamOverview && teamStats ? (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Assigned</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{teamStats.total}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Across {result.items.length} members</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-indigo-100 bg-indigo-50/80 text-indigo-600 dark:border-indigo-900/50 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <ListTodo size={20} />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/30 p-4 shadow-sm shadow-slate-900/[0.02] dark:border-amber-900/40 dark:from-slate-900 dark:to-amber-950/15">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400">Pending Tasks</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{teamStats.pending}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Awaiting follow-up</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-200/60 bg-amber-100/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/70 dark:text-amber-300">
                  <Clock size={20} />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/30 p-4 shadow-sm shadow-slate-900/[0.02] dark:border-emerald-900/40 dark:from-slate-900 dark:to-emerald-950/15">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400">Completed</p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <p className="text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{teamStats.completed}</p>
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {teamCompletionRate}%
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Team completion rate</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-200/60 bg-emerald-100/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <CheckCircle2 size={20} />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-rose-200/70 bg-gradient-to-br from-white to-rose-50/30 p-4 shadow-sm shadow-slate-900/[0.02] dark:border-rose-900/40 dark:from-slate-900 dark:to-rose-950/15">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700/80 dark:text-rose-400">Overdue</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{teamStats.overdue}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Needs immediate action</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-rose-200/60 bg-rose-100/70 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/70 dark:text-rose-300">
                  <AlertTriangle size={20} />
                </span>
              </div>
            </>
          ) : taskStats ? (
            <>
              <div className="flex items-center justify-between rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm shadow-slate-900/[0.02] dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Matching Tasks</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{result.total}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Showing {result.items.length} on this page</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-teal-100 bg-teal-50/80 text-teal-600 dark:border-teal-900/50 dark:bg-teal-950/60 dark:text-teal-300">
                  <ListTodo size={20} />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-amber-200/70 bg-gradient-to-br from-white to-amber-50/30 p-4 shadow-sm shadow-slate-900/[0.02] dark:border-amber-900/40 dark:from-slate-900 dark:to-amber-950/15">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700/80 dark:text-amber-400">Pending (Page)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-amber-700 dark:text-amber-300">{taskStats.pending}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Open follow-ups</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-amber-200/60 bg-amber-100/70 text-amber-700 dark:border-amber-800/50 dark:bg-amber-950/70 dark:text-amber-300">
                  <Clock size={20} />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-white to-emerald-50/30 p-4 shadow-sm shadow-slate-900/[0.02] dark:border-emerald-900/40 dark:from-slate-900 dark:to-emerald-950/15">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700/80 dark:text-emerald-400">Completed (Page)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{taskStats.completed}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Finished tasks</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-emerald-200/60 bg-emerald-100/70 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/70 dark:text-emerald-300">
                  <CheckCircle2 size={20} />
                </span>
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-rose-200/70 bg-gradient-to-br from-white to-rose-50/30 p-4 shadow-sm shadow-slate-900/[0.02] dark:border-rose-900/40 dark:from-slate-900 dark:to-rose-950/15">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-rose-700/80 dark:text-rose-400">Overdue (Page)</p>
                  <p className="mt-1 text-2xl font-bold tabular-nums text-rose-700 dark:text-rose-300">{taskStats.overdue}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-slate-500">Past due date</p>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-xl border border-rose-200/60 bg-rose-100/70 text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/70 dark:text-rose-300">
                  <Flame size={20} />
                </span>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Refined Filter Bar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-900/[0.025] dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-600 dark:text-slate-300">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/70 dark:text-teal-300">
              <SlidersHorizontal size={13} />
            </span>
            Refine tasks
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold text-teal-700 transition hover:bg-teal-50 dark:text-teal-300 dark:hover:bg-teal-950/50"
            >
              <RotateCcw size={12} /> Reset filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap lg:items-end">
          <label className="min-w-[200px] flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Calendar size={13} className="text-teal-600 dark:text-teal-400" /> Date range
            </span>
            <select
              className={dateInputClass}
              value={preset}
              onChange={event => {
                const next = event.target.value as Preset;
                setPreset(next);
                if (next === "work") {
                  setDateField("dueDate");
                  setStatus("");
                }
                setPage(1);
              }}
            >
              {presets.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-[170px] flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <CalendarClock size={13} className="text-indigo-500 dark:text-indigo-400" /> Date type
            </span>
            <select
              className={dateInputClass}
              value={dateField}
              onChange={event => {
                setDateField(event.target.value as typeof dateField);
                if (preset === "work") setPreset("today");
                setPage(1);
              }}
            >
              <option value="dueDate">Due date</option>
              <option value="assignedAt">Assigned date</option>
            </select>
          </label>

          {preset === "custom" && (
            <>
              <label className="min-w-[155px] flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-slate-400" /> From
                </span>
                <input
                  type="date"
                  className={dateInputClass}
                  value={dateFrom}
                  onChange={event => {
                    setDateFrom(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
              <label className="min-w-[155px] flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-slate-400" /> To
                </span>
                <input
                  type="date"
                  className={dateInputClass}
                  value={dateTo}
                  onChange={event => {
                    setDateTo(event.target.value);
                    setPage(1);
                  }}
                />
              </label>
            </>
          )}

          <label className="min-w-[170px] flex-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <Filter size={13} className="text-amber-500 dark:text-amber-400" /> Task status
            </span>
            <select
              className={dateInputClass}
              value={preset === "work" ? "pending" : status}
              onChange={event => {
                setStatus(event.target.value as typeof status);
                if (preset === "work") setPreset("all");
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>
      </div>

      {/* Main Content Section */}
      <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.025] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-teal-600 shadow-sm ring-1 ring-slate-200/70 dark:bg-slate-800 dark:text-teal-400 dark:ring-slate-700">
              {isTeamView ? (agent ? <ListTodo size={16} /> : <Users size={16} />) : <ListTodo size={16} />}
            </span>
            <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
              {isTeamView ? (agent ? "Assigned tasks" : "Team members") : "My tasks"}
            </h2>
            {result && (
              <span
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200/80 bg-teal-50 px-3 py-0.5 text-xs font-bold tabular-nums text-teal-800 dark:border-teal-800/70 dark:bg-teal-950 dark:text-teal-200"
                aria-live="polite"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                {result.total} matching
              </span>
            )}
          </div>
          {result && (
            <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200/60 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
              Showing <strong className="font-semibold text-slate-700 dark:text-slate-200">{result.items.length}</strong> of{" "}
              <strong className="font-semibold text-slate-700 dark:text-slate-200">{result.total}</strong>
            </span>
          )}
        </div>

        {actionError && (
          <div role="alert" className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle size={16} className="shrink-0" />
            {actionError}
          </div>
        )}

        {error ? (
          <div role="alert" className="space-y-3 px-6 py-10 text-center text-sm text-rose-700 dark:text-rose-300">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
              <AlertTriangle size={20} />
            </span>
            <p className="font-medium">{error}</p>
            {!invalidRange && (
              <button
                type="button"
                onClick={() => setRefresh(value => value + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700"
              >
                <RotateCcw size={13} /> Retry
              </button>
            )}
          </div>
        ) : !result ? (
          <div role="status" className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Loading sales tasks…</p>
          </div>
        ) : !result.items.length ? (
          <div className="grid justify-items-center gap-2.5 px-6 py-16 text-center text-sm text-slate-600 dark:text-slate-300">
            <span className="mb-1 grid h-14 w-14 place-items-center rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-slate-100/80 text-teal-600 shadow-sm dark:border-slate-700 dark:from-slate-800 dark:to-slate-800/60 dark:text-teal-400">
              <CalendarDays size={24} />
            </span>
            <p className="text-base font-bold text-slate-800 dark:text-slate-100">
              {preset === "work" ? "You’re all caught up!" : "No tasks found"}
            </p>
            <p className="max-w-sm text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              {preset === "work"
                ? "There are no pending tasks due today or overdue. Great job staying on top of your leads!"
                : "Try adjusting the date range, status filters, or search query to broaden your results."}
            </p>
            {preset === "work" && (
              <button
                type="button"
                className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 dark:border-teal-800 dark:bg-teal-950/60 dark:text-teal-200"
                onClick={() => {
                  setPreset("all");
                  setPage(1);
                }}
              >
                <Calendar size={14} /> View all dates
              </button>
            )}
          </div>
        ) : isTeamView && !agent ? (
          <div className="grid grid-cols-1 gap-5 bg-slate-50/50 p-5 sm:grid-cols-2 sm:p-6 xl:grid-cols-3 dark:bg-slate-950/30">
            {result.items.map(member => {
              const name = member.assigneeName || "Team member";
              const total = member.taskCount ?? 0;
              const completed = member.completed ?? 0;
              const pending = member.pending ?? 0;
              const overdue = member.overdue ?? 0;
              const progress = total ? Math.round((completed / total) * 100) : 0;
              const initials = name
                .trim()
                .split(/\s+/)
                .map(part => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const palette = getAvatarPalette(name);

              return (
                <button
                  key={member.id}
                  type="button"
                  onClick={() => {
                    setAgent({ id: member.id, name });
                    setPage(1);
                  }}
                  className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 text-left shadow-sm shadow-slate-900/[0.03] transition-all duration-200 hover:-translate-y-1 hover:border-teal-300 hover:shadow-xl hover:shadow-teal-950/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-teal-700 dark:focus-visible:ring-offset-slate-900"
                  aria-label={`View ${name}’s assigned tasks`}
                >
                  {/* Top Accent Line */}
                  <span className={`absolute inset-x-0 top-0 h-1 ${palette.bg} opacity-85 transition-opacity group-hover:opacity-100`} />

                  {/* Member Header */}
                  <span className="mt-1 flex items-start justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3.5">
                      <span
                        className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white shadow-md ring-4 ${palette.bg} ${palette.ring}`}
                      >
                        {initials}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-base font-bold tracking-tight text-slate-900 transition-colors group-hover:text-teal-700 dark:text-slate-100 dark:group-hover:text-teal-300">
                          {name}
                        </span>
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                          <User size={12} className="text-slate-400" /> Assigned sales tasks
                        </span>
                      </span>
                    </span>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-400 transition-all group-hover:border-teal-200 group-hover:bg-teal-50 group-hover:text-teal-700 dark:border-slate-700 dark:bg-slate-800 dark:group-hover:border-teal-800 dark:group-hover:bg-teal-950 dark:group-hover:text-teal-300">
                      <ArrowUpRight size={17} />
                    </span>
                  </span>

                  {/* Total Count Hero */}
                  <span className="mt-5 flex items-baseline justify-between rounded-xl bg-slate-50/90 px-4 py-3 ring-1 ring-slate-200/60 dark:bg-slate-800/40 dark:ring-slate-800">
                    <span className="flex items-baseline gap-2">
                      <span className="text-3xl font-extrabold tracking-tight tabular-nums text-slate-900 dark:text-white">
                        {total}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        tasks in selected period
                      </span>
                    </span>
                    {overdue > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                        <Flame size={11} /> {overdue} overdue
                      </span>
                    ) : total > 0 && progress === 100 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                        <CheckCircle2 size={11} /> All done
                      </span>
                    ) : null}
                  </span>

                  {/* Colored Metric Boxes */}
                  <span className="mt-3.5 grid grid-cols-3 gap-2.5">
                    <span className="flex flex-col rounded-xl border border-amber-200/70 bg-amber-50/60 p-3 dark:border-amber-900/40 dark:bg-amber-950/25">
                      <span className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-amber-800/80 dark:text-amber-300/90">Pending</span>
                        <Clock size={13} className="text-amber-600 dark:text-amber-400" />
                      </span>
                      <span className="mt-1.5 text-xl font-bold tabular-nums text-amber-700 dark:text-amber-300">
                        {pending}
                      </span>
                    </span>

                    <span className="flex flex-col rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/25">
                      <span className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-800/80 dark:text-emerald-300/90">Completed</span>
                        <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" />
                      </span>
                      <span className="mt-1.5 text-xl font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                        {completed}
                      </span>
                    </span>

                    <span className="flex flex-col rounded-xl border border-rose-200/70 bg-rose-50/60 p-3 dark:border-rose-900/40 dark:bg-rose-950/25">
                      <span className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-rose-800/80 dark:text-rose-300/90">Overdue</span>
                        <AlertTriangle size={13} className="text-rose-600 dark:text-rose-400" />
                      </span>
                      <span className="mt-1.5 text-xl font-bold tabular-nums text-rose-700 dark:text-rose-300">
                        {overdue}
                      </span>
                    </span>
                  </span>

                  {/* Completion Progress Bar */}
                  <span className="mt-5 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-500 dark:text-slate-400">
                      <TrendingUp size={13} className="text-teal-600 dark:text-teal-400" /> Completion rate
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold tabular-nums ${
                        progress >= 75
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                          : progress >= 30
                            ? "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300"
                            : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      {progress}%
                    </span>
                  </span>
                  <span
                    className="mt-2 block h-2 overflow-hidden rounded-full bg-slate-100 p-0.5 dark:bg-slate-800"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </span>

                  {/* Card Footer */}
                  <span className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3.5 text-xs dark:border-slate-800">
                    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100/80 px-2 py-1 text-[11px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      View only
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-teal-700 transition-transform group-hover:translate-x-0.5 dark:text-teal-300">
                      View assigned tasks →
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] text-left text-sm text-slate-700 dark:text-slate-200">
              <thead className="border-b border-slate-200/70 bg-slate-50/90 text-[11px] font-bold uppercase tracking-[0.07em] text-slate-500 dark:border-slate-800 dark:bg-slate-800/70 dark:text-slate-400">
                <tr>
                  {["Task", "Lead", "Assigned", "Due", "Engagement", "Task status"].map(label => (
                    <th key={label} scope="col" className="px-4 py-3.5 first:pl-6 last:pr-6">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {result.items.map(task => {
                  const dueDateObj = new Date(task.dueDate);
                  const todayStart = new Date();
                  todayStart.setHours(0, 0, 0, 0);
                  const isOverdue = task.status === "pending" && dueDateObj < todayStart;

                  return (
                    <tr
                      key={task.id}
                      className="transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40"
                    >
                      <td className="max-w-[280px] px-4 py-4 first:pl-6">
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border ${
                              task.status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-400"
                                : isOverdue
                                  ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-400"
                                  : "border-teal-200/80 bg-teal-50/80 text-teal-700 dark:border-teal-900/50 dark:bg-teal-950/60 dark:text-teal-300"
                            }`}
                          >
                            {task.status === "completed" ? <CheckCircle2 size={14} /> : <ListTodo size={14} />}
                          </span>
                          <div className="min-w-0">
                            <div className="break-words font-semibold leading-5 text-slate-900 dark:text-white">
                              {task.title}
                            </div>
                            {isTeamView && (
                              <p className="mt-1 inline-flex items-center gap-1 rounded-md bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-800 dark:bg-teal-950/60 dark:text-teal-300">
                                <User size={11} /> {task.assigneeName || "Team member"}
                              </p>
                            )}
                            {task.instructions && (
                              <p className="mt-1.5 whitespace-pre-wrap break-words text-xs leading-5 text-slate-500 dark:text-slate-400">
                                {task.instructions}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[240px] px-4 py-4">
                        <Link
                          href={`/leads/view/${task.leadId}`}
                          className="inline-flex items-center gap-1.5 break-words font-semibold leading-5 text-teal-800 decoration-teal-300 underline-offset-4 hover:underline dark:text-teal-300"
                        >
                          {task.leadName || task.leadCode || "Open lead"} <ArrowUpRight size={14} className="shrink-0" />
                        </Link>
                        {task.leadName && task.leadCode && (
                          <p className="mt-1 max-w-[220px] break-all font-mono text-[10px] leading-4 text-slate-400 dark:text-slate-500">
                            {task.leadCode}
                          </p>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[13px] tabular-nums text-slate-600 dark:text-slate-300">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          {displayDate.format(new Date(task.assignedAt))}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-[13px] tabular-nums">
                        <span
                          className={`inline-flex items-center gap-1.5 font-medium ${
                            isOverdue
                              ? "rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300"
                              : "text-slate-600 dark:text-slate-300"
                          }`}
                        >
                          <CalendarClock size={13} className={isOverdue ? "text-rose-600 dark:text-rose-400" : "text-slate-400"} />
                          {displayDate.format(dueDateObj)}
                          {isOverdue && <span className="ml-0.5 text-[10px] font-bold uppercase">Overdue</span>}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <StatusDropdown
                          Id={task.leadId}
                          currentStatus={task.connectStatus ?? LeadEngagementStatus.NOT_REACHED}
                          followUpAt={task.followUpAt}
                          onStatusUpdate={updateEngagement}
                          readOnly={isTeamView || !canUpdateEngagement}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 last:pr-6">
                        <div className="flex flex-col items-start gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                              task.status === "completed"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/70 dark:text-emerald-200"
                                : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/70 dark:text-amber-200"
                            }`}
                          >
                            {task.status === "completed" ? (
                              <>
                                <CheckCircle2 size={13} className="text-emerald-600 dark:text-emerald-400" /> Completed
                              </>
                            ) : (
                              <>
                                <Clock size={13} className="text-amber-600 dark:text-amber-400" /> Pending
                              </>
                            )}
                          </span>
                          {!isTeamView && task.status === "pending" && (
                            <button
                              type="button"
                              disabled={!!completing}
                              onClick={() => markComplete(task.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-teal-200/80 bg-teal-50/70 px-2.5 py-1 text-xs font-semibold text-teal-800 transition hover:bg-teal-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/30 disabled:opacity-60 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-300 dark:hover:bg-teal-900/60"
                            >
                              <Check size={13} strokeWidth={2.4} />{" "}
                              {completing === task.id ? "Saving…" : "Mark complete"}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {result && result.total > pageSize && (
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/40 px-6 py-3.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
            <button
              type="button"
              disabled={page === 1}
              onClick={() => setPage(value => value - 1)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Previous
            </button>
            <span className="px-2 font-medium tabular-nums">
              Page <strong className="text-slate-800 dark:text-slate-200">{page}</strong> of{" "}
              <strong className="text-slate-800 dark:text-slate-200">{Math.ceil(result.total / pageSize)}</strong>
            </span>
            <button
              type="button"
              disabled={page * pageSize >= result.total}
              onClick={() => setPage(value => value + 1)}
              className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </section>
  );
}
