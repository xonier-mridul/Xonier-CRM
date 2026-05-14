"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend, Line,
} from "recharts";
import {
    RefreshCw, AlertCircle, CheckCircle2, Clock, AlertTriangle,
    Repeat2, Tag, BarChart2, ShieldOff, Lock, Activity, Zap, TrendingDown,
} from "lucide-react";
import { DashboardService } from "@/src/services/dashboard.service";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { Odometer } from "@/src/components/common/odometer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaskSummary {
    total: number; completed: number; inProgress: number; overdue: number;
    notStarted: number; dueSoon: number; dueToday: number; recurring: number;
    subTasks: number; withAttachments: number; withTags: number;
    completionRate: number; overdueRate: number;
}

interface TaskPerformance {
    estimatedHoursTotal: number; actualHoursTotal: number;
    hoursVariance: number | null; hoursAccuracyRate: number | null;
    avgCompletionHours: number; minCompletionHours: number; maxCompletionHours: number;
    avgOverdueDays: number; maxOverdueDays: number; overdueCount: number;
}

interface ByPriority { count: number; priority: string }
interface ByCategory {
    count: number; categoryId: string; categoryName: string;
    categoryColor: string; categoryIcon: string; visibility: string;
}
interface ByStatus {
    count: number; statusId: string | null; statusName: string;
    statusColor: string; statusIcon: string; statusType: string;
    isFinal: boolean; isDefault: boolean; order: number;
}
interface ByEntityType { count: number; entityType: string }
interface ByRecurrenceType { count: number; recurrenceType: string }
interface RecentActivity { action: string; description: string; createdAt: string }
interface ActivityData {
    totalActions: number;
    byAction: { action: string; count: number }[];
    mostEditedFields: { field: string; count: number }[];
    recentActivity: RecentActivity[];
    activityByDay: { date: string; count: number }[];
}

interface TaskStatsData {
    summary: TaskSummary;
    performance: TaskPerformance;
    breakdowns: {
        byStatus: ByStatus[]; byStatusType: { count: number; type: string }[];
        byPriority: ByPriority[]; byCategory: ByCategory[];
        byEntityType: ByEntityType[]; byRecurrenceType: ByRecurrenceType[];
    };
    trends: {
        daily: { completion: { completed: number; date: string }[]; creation: { created: number; date: string }[] };
        weekly: { count: number; dayOfWeek: number; dayName: string }[];
        monthly: { created: number; completed: number; month: string; completionRate: number }[];
    };
    activity: ActivityData;
    meta: { userId: string; generatedAt: string; filters: Record<string, unknown> };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
    urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};
const PRIORITY_BADGE: Record<string, string> = {
    urgent: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    high: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    medium: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
    low: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
};
const ACTION_BADGE: Record<string, string> = {
    status_changed: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
    due_date_changed: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
    created: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
    updated: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
    deleted: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
    assigned: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
};
const CATEGORY_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#06b6d4", "#eab308", "#a855f7"];
const ENTITY_COLORS = ["#6366f1", "#22c55e", "#f97316", "#ec4899", "#06b6d4", "#eab308"];
const RECUR_COLORS: Record<string, string> = {
    daily: "#6366f1", weekly: "#8b5cf6", monthly: "#ec4899", yearly: "#f97316",
};
const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
}
function capitalize(s: string): string {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function fmtHours(h: number): string {
    if (!h || isNaN(h)) return "—";
    return h >= 24 ? `${(h / 24).toFixed(1)}d` : `${h.toFixed(1)}h`;
}
function relTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}
function shortDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Shared UI ────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 shadow-xl text-xs">
            <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1.5">{label}</p>
            {payload.map((p: any) => (
                <div key={p.name} className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="capitalize">{p.name}:</span>
                    <span className="font-semibold text-gray-700 dark:text-gray-200">
                        {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
                    </span>
                </div>
            ))}
        </div>
    );
};

const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 ${className ?? ""}`} />
);

const SectionTitle = ({ title, sub }: { title: string; sub?: string }) => (
    <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">{title}</h2>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
    </div>
);

function RingChart({ pct, color }: { pct: number; color: string }) {
    const r = 38, circ = 2 * Math.PI * r, offset = circ - (pct / 100) * circ;
    return (
        <svg width="96" height="96" viewBox="0 0 96 96">
            <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor"
                className="text-gray-100 dark:text-gray-800" strokeWidth="8" />
            <circle cx="48" cy="48" r={r} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
                transform="rotate(-90 48 48)" style={{ transition: "stroke-dashoffset .7s ease" }} />
        </svg>
    );
}

// ─── 403 View ─────────────────────────────────────────────────────────────────

function UnauthorizedView() {
    return (
        <div className="mt-10 ml-72 min-h-screen">
            <div className="bg-white mb-10 dark:bg-gray-700 p-6 rounded-xl border border-slate-900/10 w-full">
                <div className="p-10 flex flex-col items-center text-center">
                    <div className="relative mb-8">
                        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-red-50 to-rose-100 dark:from-red-900/40 dark:to-rose-900/40 border-2 border-red-100 dark:border-red-800 flex items-center justify-center">
                            <ShieldOff className="w-10 h-10 text-red-500 dark:text-red-400" strokeWidth={1.5} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-800 flex items-center justify-center">
                            <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </div>
                    </div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-50 dark:bg-red-900/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-800 mb-4 tracking-widest uppercase">
                        403 · Forbidden
                    </span>
                    <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">Access Denied</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-sm mb-8">
                        You don't have permission to view the task dashboard.
                    </p>
                    <div className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-left">
                        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                            Reach out to your admin with your user ID to request access.
                        </p>
                    </div>
                </div>
                <p className="text-center text-xs text-gray-400 dark:text-gray-600 mt-5">
                    Error code 403 · Unauthorized access attempt has been logged
                </p>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// NEW SECTIONS
// ═══════════════════════════════════════════════════════════════════

// ── #10 Smart Insights Panel ──────────────────────────────────────

interface Insight { level: "warning" | "info" | "error"; message: string }

function buildInsights(data: TaskStatsData): Insight[] {
    const { summary, performance, breakdowns, activity } = data;
    const ins: Insight[] = [];
    if (performance.actualHoursTotal === 0 && summary.completed > 0)
        ins.push({ level: "warning", message: "No actual hours logged for completed tasks." });
    if (summary.completionRate < 60 && summary.total > 0)
        ins.push({ level: "warning", message: `Low completion rate — only ${summary.completionRate}% of tasks are done.` });
    const allNotStarted = breakdowns.byStatusType.every((s) => s.type === "not_started" || s.type === "unknown");
    if (allNotStarted && summary.total > 0)
        ins.push({ level: "error", message: "All tasks are in not-started / unknown state." });
    if (summary.overdue > 0)
        ins.push({ level: "error", message: `${summary.overdue} task${summary.overdue > 1 ? "s are" : " is"} overdue.` });
    if (performance.hoursVariance !== null && Math.abs(performance.hoursVariance) > 20)
        ins.push({ level: "warning", message: `High hours variance detected (${performance.hoursVariance > 0 ? "+" : ""}${performance.hoursVariance.toFixed(1)}h).` });
    if (summary.dueSoon > 0)
        ins.push({ level: "info", message: `${summary.dueSoon} task${summary.dueSoon > 1 ? "s are" : " is"} due soon.` });
    if (activity?.totalActions === 0)
        ins.push({ level: "info", message: "No activity logged yet for these tasks." });
    return ins;
}

const INSIGHT_STYLES = {
    error: { bg: "bg-red-50 dark:bg-red-950/40", border: "border-red-100 dark:border-red-900", dot: "bg-red-500" },
    warning: { bg: "bg-amber-50 dark:bg-amber-950/40", border: "border-amber-100 dark:border-amber-900", dot: "bg-amber-500" },
    info: { bg: "bg-blue-50 dark:bg-blue-950/40", border: "border-blue-100 dark:border-blue-900", dot: "bg-blue-500" },
};

function InsightsPanel({ data }: { data: TaskStatsData }) {
    const insights = buildInsights(data);
    if (!insights.length) return null;
    return (
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <Zap className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Smart insights</h2>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
                    {insights.length} alert{insights.length > 1 ? "s" : ""}
                </span>
            </div>
            <div className="flex flex-col gap-2">
                {insights.map((ins, i) => {
                    const s = INSIGHT_STYLES[ins.level];
                    return (
                        <div key={i} className={`flex items-start gap-3 px-3.5 py-2.5 rounded-xl border ${s.bg} ${s.border}`}>
                            <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${s.dot}`} />
                            <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{ins.message}</p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ── #1 + #2 Activity Section ──────────────────────────────────────

function ActivitySection({ activity }: { activity: ActivityData }) {
    const hasData = activity.totalActions > 0;
    return (
        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Activity insights</h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Actions over time</p>
                    </div>
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 rounded-lg">
                        <Activity className="w-3 h-3" /> {activity.totalActions} total
                    </span>
                </div>

                {hasData && activity.activityByDay.length > 0 ? (
                    <ResponsiveContainer width="100%" height={150}>
                        <BarChart data={activity.activityByDay.map((d) => ({ date: shortDate(d.date), actions: d.count }))}
                            margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={24} />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="actions" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-36 flex items-center justify-center text-xs text-gray-400 dark:text-gray-600">
                        No activity recorded yet
                    </div>
                )}

                {activity.byAction.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Top actions</p>
                        <div className="flex flex-wrap gap-1.5">
                            {activity.byAction.slice(0, 6).map((a) => (
                                <span key={a.action} className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ACTION_BADGE[a.action] ?? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                                    {capitalize(a.action)} · {a.count}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {activity.mostEditedFields.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Most edited fields</p>
                        <div className="flex flex-col gap-1.5">
                            {activity.mostEditedFields.slice(0, 4).map((f) => (
                                <div key={f.field} className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{f.field.replace(/_/g, " ")}</span>
                                    <span className="text-xs font-mono font-semibold text-gray-700 dark:text-gray-300">{f.count}×</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Recent Activity Feed */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                <SectionTitle title="Recent activity" sub="Latest 5 task events" />
                {activity.recentActivity.length > 0 ? (
                    <div className="flex flex-col gap-0">
                        {activity.recentActivity.slice(0, 5).map((item, i) => (
                            <div key={i} className="flex gap-3 relative">
                                {i < Math.min(activity.recentActivity.length, 5) - 1 && (
                                    <div className="absolute left-[10px] top-6 bottom-0 w-px bg-gray-100 dark:bg-gray-800" />
                                )}
                                <div className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 border-white dark:border-gray-800 bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center z-10">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                </div>
                                <div className="pb-4 flex-1 min-w-0">
                                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">{item.description}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ACTION_BADGE[item.action] ?? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"}`}>
                                            {capitalize(item.action)}
                                        </span>
                                        <span className="text-[10px] text-gray-400 dark:text-gray-600">{relTime(item.createdAt)}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-40 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-600">
                        <Activity className="w-6 h-6 opacity-40" />
                        <p className="text-xs">No recent activity</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── #4 Entity Type ────────────────────────────────────────────────

function EntityTypeBreakdown({ entities, total }: { entities: ByEntityType[]; total: number }) {
    if (!entities.length) return null;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <SectionTitle title="Entity type breakdown" sub="Tasks linked by entity" />
            <div className="grid grid-cols-2 gap-3 mb-4">
                {entities.map((e, i) => {
                    const color = ENTITY_COLORS[i % ENTITY_COLORS.length];
                    const pct = total > 0 ? ((e.count / total) * 100).toFixed(1) : "0";
                    return (
                        <div key={e.entityType} className="flex items-center gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs text-gray-700 dark:text-gray-300 capitalize flex-1">
                                {e.entityType === "general" ? "General" : capitalize(e.entityType)}
                            </span>
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{e.count}</span>
                            <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">{pct}%</span>
                        </div>
                    );
                })}
            </div>
            <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                    <Pie data={entities.map((e) => ({ name: capitalize(e.entityType), value: e.count }))}
                        cx="50%" cy="50%" innerRadius={32} outerRadius={52}
                        dataKey="value" strokeWidth={0} paddingAngle={3}>
                        {entities.map((_, i) => <Cell key={i} fill={ENTITY_COLORS[i % ENTITY_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [v, ""]}
                        contentStyle={{ background: "white", border: "1px solid #f1f5f9", borderRadius: "12px", fontSize: "12px" }} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}

// ── #6 Overdue Insights ───────────────────────────────────────────

function OverdueInsights({ performance, summary }: { performance: TaskPerformance; summary: TaskSummary }) {
    const cards = [
        { label: "Overdue tasks", value: performance.overdueCount, color: "bg-red-50 dark:bg-red-950", text: "text-red-600 dark:text-red-400" },
        { label: "Avg overdue", value: performance.avgOverdueDays > 0 ? `${performance.avgOverdueDays.toFixed(1)}d` : "0d", color: "bg-orange-50 dark:bg-orange-950", text: "text-orange-600 dark:text-orange-400" },
        { label: "Max overdue", value: performance.maxOverdueDays > 0 ? `${performance.maxOverdueDays}d` : "0d", color: "bg-rose-50 dark:bg-rose-950", text: "text-rose-600 dark:text-rose-400" },
        { label: "Overdue rate", value: `${summary.overdueRate}%`, color: "bg-pink-50 dark:bg-pink-950", text: "text-pink-600 dark:text-pink-400" },
    ];
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <TrendingDown className="w-4 h-4 text-red-500" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Overdue insights</h2>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {cards.map((c) => (
                    <div key={c.label} className={`${c.color} rounded-xl p-3.5`}>
                        <p className={`font-mono text-xl font-bold ${c.text}`}>{c.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── #5 Hours Analytics ────────────────────────────────────────────

function HoursAnalytics({ performance }: { performance: TaskPerformance }) {
    const noActual = performance.actualHoursTotal === 0;
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <SectionTitle title="Hours analytics" sub="Estimated vs actual time" />
            {noActual && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900 mb-4">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">No actual hours logged yet.</p>
                </div>
            )}
            <div className="grid grid-cols-2 gap-3">
                {[
                    { label: "Estimated total", value: fmtHours(performance.estimatedHoursTotal), color: "bg-violet-50 dark:bg-violet-950", text: "text-violet-600 dark:text-violet-400" },
                    { label: "Actual total", value: fmtHours(performance.actualHoursTotal), color: noActual ? "bg-gray-50 dark:bg-gray-800" : "bg-cyan-50 dark:bg-cyan-950", text: noActual ? "text-gray-400 dark:text-gray-600" : "text-cyan-600 dark:text-cyan-400" },
                    { label: "Variance", value: performance.hoursVariance !== null ? `${performance.hoursVariance > 0 ? "+" : ""}${performance.hoursVariance.toFixed(1)}h` : "—", color: "bg-orange-50 dark:bg-orange-950", text: "text-orange-600 dark:text-orange-400" },
                    { label: "Accuracy rate", value: performance.hoursAccuracyRate !== null ? `${performance.hoursAccuracyRate.toFixed(0)}%` : "—", color: "bg-green-50 dark:bg-green-950", text: "text-green-600 dark:text-green-400" },
                    { label: "Avg completion", value: fmtHours(performance.avgCompletionHours), color: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-600 dark:text-indigo-400" },
                    { label: "Fastest task", value: fmtHours(performance.minCompletionHours), color: "bg-teal-50 dark:bg-teal-950", text: "text-teal-600 dark:text-teal-400" },
                ].map((item) => (
                    <div key={item.label} className={`${item.color} rounded-xl p-3.5`}>
                        <p className={`font-mono text-xl font-bold ${item.text}`}>{item.value}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ── #7 Recurrence Detail ──────────────────────────────────────────

function RecurrenceDetail({ recurrences, total }: { recurrences: ByRecurrenceType[]; total: number }) {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <Repeat2 className="w-4 h-4 text-violet-500" />
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Recurrence detail</h2>
                {recurrences.length > 0 && (
                    <span className="ml-auto text-xs font-mono font-semibold text-violet-600 dark:text-violet-400">
                        {recurrences.reduce((s, r) => s + r.count, 0)} total
                    </span>
                )}
            </div>
            {recurrences.length > 0 ? (
                <div className="flex flex-col gap-3">
                    {recurrences.map((r) => {
                        const color = RECUR_COLORS[r.recurrenceType] ?? "#94a3b8";
                        const pct = total > 0 ? ((r.count / total) * 100).toFixed(1) : "0";
                        return (
                            <div key={r.recurrenceType}>
                                <div className="flex items-center justify-between mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{r.recurrenceType}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{r.count}</span>
                                        <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 w-10 text-right">{pct}%</span>
                                    </div>
                                </div>
                                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                    <div className="h-1.5 rounded-full transition-all duration-700"
                                        style={{ width: `${parseFloat(pct)}%`, backgroundColor: color }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-xs text-gray-400 dark:text-gray-600">No recurring tasks</p>
            )}
        </div>
    );
}

// ── #8 Monthly Trends Chart ───────────────────────────────────────

function MonthlyTrendsChart({ monthly }: { monthly: { created: number; completed: number; month: string; completionRate: number }[] }) {
    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <SectionTitle title="Monthly trends" sub="Created vs completed · completion rate" />
            {monthly.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={monthly} margin={{ top: 5, right: 20, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                        <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis yAxisId="left" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                        <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                        <Bar yAxisId="left" dataKey="created" name="Created" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        <Bar yAxisId="left" dataKey="completed" name="Completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Line yAxisId="right" type="monotone" dataKey="completionRate" name="Rate %"
                            stroke="#f97316" strokeWidth={2} dot={{ r: 3, fill: "#f97316" }} />
                    </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-40 flex items-center justify-center text-xs text-gray-400 dark:text-gray-600">No monthly data</div>
            )}
        </div>
    );
}

// ── #9 Combined Trend Chart ───────────────────────────────────────

function CombinedTrendChart({
    creation, completion,
}: {
    creation: { date: string; created: number }[];
    completion: { date: string; completed: number }[];
}) {
    const map: Record<string, { date: string; created: number; completed: number }> = {};
    creation.forEach((d) => { map[d.date] = { date: d.date, created: d.created, completed: 0 }; });
    completion.forEach((d) => {
        if (map[d.date]) map[d.date].completed = d.completed;
        else map[d.date] = { date: d.date, created: 0, completed: d.completed };
    });
    const merged = Object.values(map).sort((a, b) => a.date.localeCompare(b.date));

    return (
        <div className="col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-5">
                <div>
                    <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Daily task trend</h2>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Created and completed — combined view</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#6366f1" }} /> Created
                    </span>
                    <span className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "#22c55e" }} /> Completed
                    </span>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={merged} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
                    <defs>
                        <linearGradient id="gCreated" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gCompleted" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                            <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="created" stroke="#6366f1" strokeWidth={2.5} fill="url(#gCreated)"
                        dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
                    <Area type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2.5} fill="url(#gCompleted)"
                        dot={false} activeDot={{ r: 5, fill: "#22c55e", strokeWidth: 0 }} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════



export default function TaskDashboardPage() {
    const [data, setData] = useState<TaskStatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorStatus, setErrStat] = useState<number | null>(null);
    const [refreshing, setRefresh] = useState(false);
    const auth = useSelector((state: RootState) => state.auth);
    const USER_ID = auth.user?._id || "";

    const load = useCallback(async (showRefresh = false) => {
        try {
            if (showRefresh) setRefresh(true); else setLoading(true);
            setError(null); setErrStat(null);

            const res = await DashboardService.getAllCommon(USER_ID);
            if (res.status === 200) {
                const data = res.data.data;
                setData(data);
            }
            else throw new Error(res.data.message);

        } catch (err: any) {
            setErrStat(err?.response?.status ?? null);
            setError(err?.response?.data?.message ?? err?.message ?? "Failed to load task stats");
        } finally {
            setLoading(false); setRefresh(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading) {
        return (
            <div className="mt-10 ml-72 flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-700 min-h-screen">
                <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
                </div>
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="col-span-2 h-64" /> <Skeleton className="h-64" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-52" /> <Skeleton className="h-52" />
                </div>
            </div>
        );
    }

    if (errorStatus === 403) return <UnauthorizedView />;

    if (error) return (
        <div className="mt-10 ml-72 flex items-center justify-center h-96">
            <div className="flex flex-col items-center gap-3 text-center">
                <AlertCircle className="w-10 h-10 text-red-400" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{error}</p>
                <button onClick={() => load()}
                    className="mt-1 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                    Retry
                </button>
            </div>
        </div>
    );

    if (!data) return null;

    const { summary, performance, breakdowns, trends, activity } = data;
    const totalTasks = Math.max(summary.total, 1);

    const weeklyBarData = ALL_DAYS.map((day) => {
        const match = trends.weekly.find((w) => w.dayName.slice(0, 3) === day);
        return { day, count: match?.count ?? 0 };
    });
    const weeklyMax = Math.max(...weeklyBarData.map((d) => d.count), 1);

    const kpiCards = [
        { label: "Total tasks", value: fmt(summary.total), sub: `${summary.completed} completed · ${summary.inProgress} in progress`, barPct: summary.completionRate, color: "#6366f1", iconBg: "bg-indigo-500", icon: <BarChart2 className="w-4 h-4" /> },
        { label: "Completion rate", value: `${summary.completionRate}%`, sub: `${summary.completed} of ${summary.total} tasks done`, barPct: summary.completionRate, color: "#22c55e", iconBg: "bg-green-500", icon: <CheckCircle2 className="w-4 h-4" /> },
        { label: "Overdue", value: fmt(summary.overdue), sub: `${summary.overdueRate}% overdue rate · ${summary.dueSoon} due soon`, barPct: summary.overdueRate, color: "#ef4444", iconBg: "bg-red-500", icon: <AlertTriangle className="w-4 h-4" /> },
        { label: "Due today", value: fmt(summary.dueToday), sub: `${summary.dueSoon} due this week`, barPct: Math.min((summary.dueToday / totalTasks) * 100, 100), color: "#f97316", iconBg: "bg-orange-500", icon: <Clock className="w-4 h-4" /> },
        { label: "Recurring", value: fmt(summary.recurring), sub: breakdowns.byRecurrenceType.map((r) => capitalize(r.recurrenceType)).join(" · ") || "No recurrences", barPct: Math.min((summary.recurring / totalTasks) * 100, 100), color: "#8b5cf6", iconBg: "bg-violet-500", icon: <Repeat2 className="w-4 h-4" /> },
        { label: "With tags", value: fmt(summary.withTags), sub: `${summary.withAttachments} with attachments · ${summary.subTasks} subtasks`, barPct: Math.min((summary.withTags / totalTasks) * 100, 100), color: "#06b6d4", iconBg: "bg-cyan-500", icon: <Tag className="w-4 h-4" /> },
    ];

    return (
        <div className="mt-10 ml-72">
            <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">Task Dashboard</h1>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-2">
                            Generated {new Date(data.meta.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 text-[10px] font-semibold uppercase tracking-wide">Personal</span>
                        </p>
                    </div>
                    <button onClick={() => load(true)} disabled={refreshing}
                        className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50">
                        <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                </div>

                
                {/* Row 1: KPI cards */}
                <div className="grid grid-cols-3 gap-4">
                    {kpiCards.slice(0, 3).map((card) => (
                        <div key={card.label}
                            className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{card.label}</p>
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${card.iconBg}`}>{card.icon}</span>
                            </div>
                            <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                                <Odometer value={(card.value.replace(/[^0-9.]/g, ""))} />
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">{card.sub}</p>
                            <div className="mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                                <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${Math.min(card.barPct, 100)}%`, background: card.color }} />
                            </div>
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                    {kpiCards.slice(3).map((card) => (
                        <div key={card.label}
                            className="relative overflow-hidden bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md transition-shadow duration-200">
                            <div className="flex items-start justify-between mb-3">
                                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{card.label}</p>
                                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${card.iconBg}`}>{card.icon}</span>
                            </div>
                            <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                                <Odometer value={Number(card.value.replace(/[^0-9.]/g, ""))} />
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">{card.sub}</p>
                            <div className="mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                                <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${Math.min(card.barPct, 100)}%`, background: card.color }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Row 2: #9 Combined trend + ring */}
                <div className="grid grid-cols-3 gap-4">
                    <CombinedTrendChart creation={trends.daily.creation} completion={trends.daily.completion} />
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 flex flex-col items-center justify-center gap-4">
                        <SectionTitle title="Completion rate" sub="Overall task progress" />
                        <div className="relative flex items-center justify-center">
                            <RingChart pct={summary.completionRate} color="#22c55e" />
                            <div className="absolute flex flex-col items-center">
                                <span className="font-mono text-l font-bold text-gray-900 dark:text-white">{summary.completionRate}%</span>
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">done</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 w-full text-center">
                            {[
                                { label: "Completed", value: summary.completed, color: "text-green-500" },
                                { label: "In progress", value: summary.inProgress, color: "text-indigo-500" },
                                { label: "Not started", value: summary.notStarted, color: "text-gray-400" },
                            ].map((item) => (
                                <div key={item.label}>
                                    <p className={`font-mono text-lg font-bold ${item.color}`}>{item.value}</p>
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500">{item.label}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* #10 Smart Insights */}
                <InsightsPanel data={data} />

                {/* Row 3: Priority + #3 Fixed Status + Category */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Priority */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                        <SectionTitle title="Priority breakdown" sub="Tasks by urgency level" />
                        <div className="flex flex-col gap-3">
                            {breakdowns.byPriority.length > 0 ? breakdowns.byPriority.map((item) => {
                                const pct = ((item.count / totalTasks) * 100).toFixed(1);
                                const color = PRIORITY_COLORS[item.priority] ?? "#94a3b8";
                                return (
                                    <div key={item.priority}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[item.priority] ?? "bg-gray-100 text-gray-600"}`}>{item.priority}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.count}</span>
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-10 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${parseFloat(pct)}%`, backgroundColor: color }} />
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-xs text-gray-400 dark:text-gray-600">No priority data</p>}
                        </div>
                    </div>

                    {/* #3 Fixed Status using byStatus */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                        <SectionTitle title="Status breakdown" sub="Detailed status distribution" />
                        <div className="flex flex-col gap-3">
                            {breakdowns.byStatus.length > 0 ? breakdowns.byStatus.map((item) => {
                                const pct = ((item.count / totalTasks) * 100).toFixed(1);
                                const color = item.statusColor || "#94a3b8";
                                return (
                                    <div key={item.statusId ?? item.statusName}>
                                        <div className="flex items-center justify-between mb-1">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">{item.statusName}</span>
                                                {item.isFinal && (
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 dark:bg-green-950 text-green-600 dark:text-green-400 font-semibold">Final</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.count}</span>
                                                <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-10 text-right">{pct}%</span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                                            <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${parseFloat(pct)}%`, backgroundColor: color }} />
                                        </div>
                                    </div>
                                );
                            }) : <p className="text-xs text-gray-400 dark:text-gray-600">No status data</p>}
                        </div>
                    </div>

                    {/* Category */}
                    <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                        <SectionTitle title="Categories" sub="Distribution by category" />
                        <div className="flex flex-col gap-2">
                            {breakdowns.byCategory.length > 0 ? breakdowns.byCategory.map((cat, i) => {
                                const color = cat.categoryColor || CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                                const pct = ((cat.count / totalTasks) * 100).toFixed(1);
                                return (
                                    <div key={cat.categoryId} className="flex items-center gap-2.5">
                                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                        <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{cat.categoryIcon} {cat.categoryName}</span>
                                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{cat.count}</span>
                                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-10 text-right">{pct}%</span>
                                    </div>
                                );
                            }) : <p className="text-xs text-gray-400 dark:text-gray-600">No category data</p>}
                        </div>
                        {breakdowns.byCategory.length > 0 && (
                            <div className="mt-4">
                                <ResponsiveContainer width="100%" height={100}>
                                    <PieChart>
                                        <Pie data={breakdowns.byCategory.map((c) => ({ name: c.categoryName, value: c.count }))}
                                            cx="50%" cy="50%" innerRadius={28} outerRadius={44}
                                            dataKey="value" strokeWidth={0} paddingAngle={3}>
                                            {breakdowns.byCategory.map((c, i) => (
                                                <Cell key={i} fill={c.categoryColor || CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(v) => [v, ""]}
                                            contentStyle={{ background: "white", border: "1px solid #f1f5f9", borderRadius: "12px", fontSize: "12px" }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Row 4: #1 + #2 Activity Section */}
                {activity && <ActivitySection activity={activity} />}

                {/* Row 5: #6 Overdue + #5 Hours + #7 Recurrence */}
                <div className="grid grid-cols-3 gap-4">
                    <OverdueInsights performance={performance} summary={summary} />
                    <HoursAnalytics performance={performance} />
                    <RecurrenceDetail recurrences={breakdowns.byRecurrenceType} total={totalTasks} />
                </div>

                {/* Row 6: #8 Monthly Trends + #4 Entity Type */}
                <div className="grid grid-cols-2 gap-4">
                    <MonthlyTrendsChart monthly={trends.monthly} />
                    <EntityTypeBreakdown entities={breakdowns.byEntityType} total={totalTasks} />
                </div>

                {/* Row 7: Weekly Activity */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                    <SectionTitle title="Weekly activity pattern" sub="Tasks created by day of week" />
                    <div className="flex items-end gap-2 h-32">
                        {weeklyBarData.map((d) => (
                            <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                                <span className="text-[10px] font-mono text-gray-400 dark:text-gray-500">{d.count || ""}</span>
                                <div className="w-full rounded-t-md transition-all duration-700"
                                    style={{ height: `${Math.max((d.count / weeklyMax) * 80, d.count > 0 ? 6 : 2)}px`, background: d.count > 0 ? "#6366f1" : "#e2e8f0" }} />
                                <span className="text-[10px] text-gray-400 dark:text-gray-500">{d.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Row 8: Activity Snapshot */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
                    <SectionTitle title="Activity snapshot" sub="Key task metrics at a glance" />
                    <div className="grid grid-cols-4 gap-3">
                        {[
                            { label: "Sub tasks", value: summary.subTasks, color: "bg-slate-100 dark:bg-slate-800", text: "text-slate-600 dark:text-slate-400" },
                            { label: "With attachments", value: summary.withAttachments, color: "bg-cyan-50 dark:bg-cyan-950", text: "text-cyan-600 dark:text-cyan-400" },
                            { label: "With tags", value: summary.withTags, color: "bg-violet-50 dark:bg-violet-950", text: "text-violet-600 dark:text-violet-400" },
                            { label: "Max overdue days", value: performance.maxOverdueDays > 0 ? `${performance.maxOverdueDays}d` : "0d", color: "bg-red-50 dark:bg-red-950", text: "text-red-600 dark:text-red-400" },
                        ].map((item) => (
                            <div key={item.label} className={`${item.color} rounded-xl p-3.5`}>
                                <span className={`font-mono text-xl font-bold ${item.text}`}>{item.value}</span>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}