"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@/src/hooks/usePermissions";
import { MdOutlineLeaderboard } from "react-icons/md";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  Users,
  TrendingUp,
  MessageSquare,
  Handshake,
  RefreshCw,
  AlertCircle,
  ArrowUpRight,
  Activity,
  DollarSign,
  Trash2,
  BarChart2,
  ShieldCheck,
} from "lucide-react";

import { DashboardService } from "@/src/services/dashboard.service";
import { PERMISSIONS } from "@/src/constants/enum";
import type {
  DashboardData,
  LeadStatus,
  DealPipelineStage,
} from "@/src/types/dashboard/dashboard.types";
import Link from "next/link";

// ─── Constants ────────────────────────────────────────────────────────────────

const PIPELINE_COLORS: Record<DealPipelineStage, string> = {
  qualification: "#6366f1",
  requirement_analysis: "#8b5cf6",
  proposal: "#ec4899",
  negotiation: "#f97316",
  won: "#22c55e",
  lost: "#ef4444",
};

const SOURCE_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f97316",
  "#22c55e", "#06b6d4", "#eab308", "#a855f7",
];

// ── "delete" status added to both maps ───────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  new: "#6366f1",
  contacted: "#eab308",
  qualified: "#8b5cf6",
  proposal: "#06b6d4",
  won: "#22c55e",
  lost: "#ef4444",
  delete: "#94a3b8",
};

const STATUS_BADGE: Record<string, string> = {
  new: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400",
  contacted: "bg-yellow-50 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400",
  qualified: "bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400",
  proposal: "bg-cyan-50 text-cyan-600 dark:bg-cyan-950 dark:text-cyan-400",
  won: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  lost: "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400",
  delete: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const AVATAR_BG = [
  "bg-indigo-500", "bg-violet-500", "bg-pink-500",
  "bg-orange-500", "bg-green-500", "bg-cyan-500",
];
const topPerformers = [
  { name: "Arjun Verma", deals: 14, revenue: 128000, avatar: "AV" },
  { name: "Neha Kapoor", deals: 11, revenue: 104000, avatar: "NK" },
  { name: "Rohan Das", deals: 9, revenue: 87000, avatar: "RD" },
  { name: "Meera Pillai", deals: 8, revenue: 76000, avatar: "MP" },
  { name: "Karan Singh", deals: 15, revenue: 132000, avatar: "KS" },
  { name: "Priya Sharma", deals: 10, revenue: 95000, avatar: "PS" },
  { name: "Amit Gupta", deals: 12, revenue: 110000, avatar: "AG" },
  { name: "Sneha Iyer", deals: 7, revenue: 72000, avatar: "SI" },
  { name: "Vikram Patel", deals: 13, revenue: 120000, avatar: "VP" },
  { name: "Pooja Jain", deals: 6, revenue: 68000, avatar: "PJ" },
  { name: "Rahul Mehta", deals: 9, revenue: 88000, avatar: "RM" },
  { name: "Anjali Singh", deals: 8, revenue: 79000, avatar: "AS" },
  { name: "Deepak Yadav", deals: 11, revenue: 102000, avatar: "DY" },
  { name: "Kavita Shah", deals: 10, revenue: 97000, avatar: "KS" },
  { name: "Rakesh Verma", deals: 7, revenue: 71000, avatar: "RV" },
  { name: "Sunita Patel", deals: 6, revenue: 65000, avatar: "SP" },
  { name: "Manish Tiwari", deals: 12, revenue: 115000, avatar: "MT" },
  { name: "Kunal Arora", deals: 13, revenue: 121000, avatar: "KA" },
  { name: "Divya Nair", deals: 8, revenue: 77000, avatar: "DN" },
  { name: "Harsh Vardhan", deals: 9, revenue: 86000, avatar: "HV" },
  { name: "Nikhil Joshi", deals: 11, revenue: 108000, avatar: "NJ" },
  { name: "Simran Kaur", deals: 10, revenue: 96000, avatar: "SK" },
  { name: "Yash Malhotra", deals: 14, revenue: 125000, avatar: "YM" },
  { name: "Ritu Agarwal", deals: 7, revenue: 70000, avatar: "RA" },
  { name: "Mohit Bansal", deals: 12, revenue: 112000, avatar: "MB" },
  { name: "Tanya Roy", deals: 8, revenue: 78000, avatar: "TR" },
  { name: "Aditya Saxena", deals: 9, revenue: 89000, avatar: "AS" },
  { name: "Shreya Ghosh", deals: 6, revenue: 64000, avatar: "SG" },
  { name: "Gaurav Khanna", deals: 13, revenue: 119000, avatar: "GK" },
  { name: "Isha Kapoor", deals: 10, revenue: 99000, avatar: "IK" },
  { name: "Varun Sharma", deals: 11, revenue: 105000, avatar: "VS" },
  { name: "Nisha Reddy", deals: 8, revenue: 75000, avatar: "NR" },
  { name: "Aakash Jain", deals: 9, revenue: 87000, avatar: "AJ" },
  { name: "Payal Mishra", deals: 7, revenue: 72000, avatar: "PM" },
  { name: "Rohit Batra", deals: 12, revenue: 113000, avatar: "RB" },
  { name: "Komal Sinha", deals: 10, revenue: 94000, avatar: "KS" },
  { name: "Siddharth Rao", deals: 13, revenue: 122000, avatar: "SR" },
  { name: "Ankit Chauhan", deals: 9, revenue: 88000, avatar: "AC" },
  { name: "Pallavi Joshi", deals: 8, revenue: 76000, avatar: "PJ" },
  { name: "Ravi Nair", deals: 11, revenue: 101000, avatar: "RN" },
  { name: "Neeraj Gupta", deals: 12, revenue: 109000, avatar: "NG" },
  { name: "Swati Arora", deals: 7, revenue: 70000, avatar: "SA" },
  { name: "Hemant Singh", deals: 10, revenue: 98000, avatar: "HS" },
  { name: "Alok Tiwari", deals: 6, revenue: 66000, avatar: "AT" },
  { name: "Tanvi Mehta", deals: 8, revenue: 77000, avatar: "TM" },
  { name: "Kritika Jain", deals: 9, revenue: 85000, avatar: "KJ" },
  { name: "Saurabh Yadav", deals: 11, revenue: 103000, avatar: "SY" },
  { name: "Rina Das", deals: 7, revenue: 71000, avatar: "RD" },
  { name: "Dev Sharma", deals: 12, revenue: 114000, avatar: "DS" },
  { name: "Ayesha Khan", deals: 10, revenue: 97000, avatar: "AK" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n);
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

function capitalize(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-3 py-2.5 shadow-xl text-xs">
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"today" | "this_week" | "this_month" | "this_year">("today");
  const [refreshing, setRefreshing] = useState(false);
  const [trendTab, setTrendTab] = useState<"leads" | "deals">("leads");
  const [leaderboard, setLeaderboard] = useState(false);
  const { hasPermission } = usePermissions();

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const result = await DashboardService.getAll({ page: 1, limit: 1, search: filter });
      if (result.status === 200) setData(result.data.data);
      else throw new Error(result.data.message);
    } catch (err: any) {
      setError(err?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  // ── Derived chart data ──────────────────────────────────────────────────────

  const leadTrendData = data
    ? data.monthlyLeadTrend.map((i) => ({ month: `${i.month} ${i.year}`, leads: i.count }))
    : [];

  // monthlyDealTrend — was previously unused
  const dealTrendData = data
    ? data.monthlyDealTrend.map((i) => ({ month: `${i.month} ${i.year}`, deals: i.count }))
    : [];

  const sourceChartData = data
    ? data.leadSourceBreakdown
      ?.filter((s) => s.count > 0)
      .map((s) => ({ name: capitalize(s.source), value: s.count }))
    : [];

  const totalLeads = data?.leads.total ?? 1;

  // Sum all pipeline stage amounts
  const pipelineTotalAmount = data
    ? data.dealPipelineBreakdown.reduce((sum, p) => sum + p.totalAmount, 0)
    : 0;

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mt-10 ml-72 flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-950 min-h-screen">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="col-span-2 h-72" />
          <Skeleton className="h-72" />
        </div>
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-6 h-72" />
          <Skeleton className="col-span-6 h-72" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="mt-10 ml-72 flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{error}</p>
          <button
            onClick={() => load()}
            className="mt-1 px-4 py-2 text-sm font-semibold rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  // ── KPI cards — sub text now shows deleted + active enquiries ───────────────
  const kpiCards = [
    {
      label: "Total Leads",
      value: fmt(data.leads.total),
      sub: `${fmt(data.leads.active)} active · ${data.leads.won} won · ${data.leads.deleted} deleted`,
      barPct: Math.min((data.leads.active / Math.max(data.leads.total, 1)) * 100, 100),
      color: "#6366f1",
      icon: <TrendingUp className="w-4 h-4" />,
      iconBg: "bg-indigo-500",
    },
    {
      label: "Active Deals",
      value: data.deals.active,
      sub: `${fmtCurrency(pipelineTotalAmount)} pipeline · ${data.deals.closed} closed`,
      barPct: Math.min((data.deals.active / Math.max(data.deals.total, 1)) * 100, 100),
      color: "#ec4899",
      icon: <Handshake className="w-4 h-4" />,
      iconBg: "bg-pink-500",
    },
    {
      label: "Team Members",
      value: data.users?.total ||0,
      sub: (data.users)&&(`${data.users?.thisMonth} joined · ${data.users?.inactive} inactive · ${data.users?.deleted} deleted`),
      barPct: Math.min((data.users?.active / Math.max(data.users?.total, 1)) * 100, 100),
      color: "#22c55e",
      icon: <Users className="w-4 h-4" />,
      iconBg: "bg-green-500",
    },
    {
      label: "Enquiries",
      value: data.enquiries.total,
      sub: `${data.enquiries.assigned} assigned · ${data.enquiries.unassigned} unassigned · ${data.enquiries.active} active`,
      barPct: Math.min((data.enquiries.assigned / Math.max(data.enquiries.total, 1)) * 100, 100),
      color: "#f97316",
      icon: <MessageSquare className="w-4 h-4" />,
      iconBg: "bg-orange-500",
    },
  ];

  return (
    <div className="mt-10 ml-72 flex flex-col gap-5 p-6 min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors duration-300 rounded-2xl">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
            {(data.role==="admin") ?
            "Admin Dashboard" : `Welcome Back, ${data.user?.firstName} ${data.user?.lastName}`
            }
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-2">
            {new Date(data.period.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {new Date(data.period.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            {/* period.filter from API rendered as badge */}
            <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 text-[10px] font-semibold uppercase tracking-wide">
              {data.period.filter.replace(/_/g, " ")}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-1 gap-0.5">
            {(["today", "this_week", "this_month", "this_year"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${filter === f
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                  }`}
              >
                {f.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="p-2 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ── Row 1: KPI Cards ── */}
      <div className="grid grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div
            key={card.label}
            className="relative overflow-hidden bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {card.label}
              </p>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${card.iconBg}`}>
                {card.icon}
              </span>
            </div>
            <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
              {card.value}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">{card.sub}</p>
            <div className="mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{ width: `${card.barPct}%`, background: card.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Trend Chart (leads / deals tab) + Lead Sources ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* Trend — tabbed between leads and deals (monthlyDealTrend now used) */}
        <div className="col-span-2 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">
                {trendTab === "leads" ? "Lead Trend" : "Deal Trend"}
              </h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                {trendTab === "leads" ? "Monthly lead volume" : "Monthly deal volume"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-3 py-1.5 rounded-lg">
                <Activity className="w-3 h-3" />
                {trendTab === "leads" ? fmt(data.leads.thisMonth) : data.deals.thisMonth} this month
              </span>
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                {(["leads", "deals"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTrendTab(tab)}
                    className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${trendTab === tab
                      ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-gray-500 dark:text-gray-400"
                      }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={210}>
            <AreaChart
              data={trendTab === "leads" ? leadTrendData : dealTrendData}
              margin={{ top: 5, right: 5, bottom: 0, left: 0 }}
            >
              <defs>
                <linearGradient id="gradLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradDeals" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ec4899" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false} tickLine={false} width={48}
                tickFormatter={fmt}
              />
              <Tooltip content={<CustomTooltip />} />
              {trendTab === "leads" ? (
                <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5}
                  fill="url(#gradLeads)" dot={false} activeDot={{ r: 5, fill: "#6366f1", strokeWidth: 0 }} />
              ) : (
                <Area type="monotone" dataKey="deals" stroke="#ec4899" strokeWidth={2.5}
                  fill="url(#gradDeals)" dot={false} activeDot={{ r: 5, fill: "#ec4899", strokeWidth: 0 }} />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Lead Sources Donut — now also shows raw count */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <SectionTitle title="Lead Sources" sub="Distribution by channel" />
          {sourceChartData?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={sourceChartData}
                    cx="50%" cy="50%"
                    innerRadius={45} outerRadius={68}
                    dataKey="value" strokeWidth={0} paddingAngle={3}
                  >
                    {sourceChartData.map((_, i) => (
                      <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [
                      value?.toLocaleString?.() ?? "0",
                      ""
                    ]}
                    contentStyle={{
                      background: "white", border: "1px solid #f1f5f9",
                      borderRadius: "12px", fontSize: "12px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-col gap-1.5 mt-2">
                {sourceChartData.slice(0, 5).map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                      <span className="text-xs text-gray-500 dark:text-gray-400">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-400 dark:text-gray-500">
                        {item.value.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 w-10 text-right">
                        {((item.value / totalLeads) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[160px] flex items-center justify-center text-sm text-gray-400 dark:text-gray-600">
              No source data
            </div>
          )}
        </div>
      </div>

      {/* ── Row 3: Deal Pipeline + Latest Leads ── */}
      <div className="grid grid-cols-12 gap-4">

        {/* Deal Pipeline — pipeline totalAmount badge added */}
        <div className="col-span-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Deal Pipeline</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Deals by stage</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-semibold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950 px-3 py-1.5 rounded-lg">
              <DollarSign className="w-3 h-3" />
              {fmtCurrency(pipelineTotalAmount)} total
            </span>
          </div>

          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={data.dealPipelineBreakdown.map((p) => ({
                stage: capitalize(p.pipeline).split(" ")[0],
                count: p.count,
                amount: p.totalAmount,
              }))}
              layout="vertical"
              margin={{ left: 10, right: 10, top: 16 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="stage"
                tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={65} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                {data.dealPipelineBreakdown.map((p, i) => (
                  <Cell key={i} fill={PIPELINE_COLORS[p.pipeline as DealPipelineStage] ?? "#6366f1"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Latest Leads — STATUS_BADGE now handles "delete" status */}
        <div className="col-span-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Latest Leads</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Most recent pipeline entries</p>
            </div>
            {(hasPermission(PERMISSIONS.readLead)) && <a href="/leads">
              <button className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                View all <ArrowUpRight className="w-3 h-3" />
              </button>
            </a>}
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {["Lead ID", "Source", "Status", "Time"].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 pb-3 pr-4">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {data.latestLeads.map((lead, i) => (
                <tr key={lead.lead_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_BG[i % AVATAR_BG.length]}`}>
                        {lead.source.charAt(0).toUpperCase()}
                      </div>
                      <Link href={`/leads/view/${lead.id}`} className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                        {lead.lead_id}
                      </span>                      
                      </Link>
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400 capitalize">
                      {lead.source}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[lead.status] ?? STATUS_BADGE.new}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="py-3 text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {relTime(lead.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Row 4: Revenue Cards (totalRevenue + monthlyRevenue + pipelineValue) ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            label: "Total Revenue",
            value: fmtCurrency(data.deals.totalRevenue),
            sub: "Across all closed deals",
            color: "#22c55e",
            bg: "bg-emerald-500",
            barPct: data.deals.totalRevenue > 0 ? 100 : 0,
            icon: <DollarSign className="w-4 h-4" />,
          },
          {
            label: "Monthly Revenue",
            value: fmtCurrency(data.deals?.monthlyRevenue||0),
            sub: "Revenue this period",
            color: "#8b5cf6",
            bg: "bg-violet-500",
            barPct: data.deals.monthlyRevenue > 0 ? 100 : 0,
            icon: <BarChart2 className="w-4 h-4" />,
          },
          {
            label: "Pipeline Value",
            value: fmtCurrency(pipelineTotalAmount),
            sub: `Across ${data.deals.active} active deals`,
            color: "#ec4899",
            bg: "bg-pink-500",
            barPct: pipelineTotalAmount > 0 ? 100 : 0,
            icon: <ShieldCheck className="w-4 h-4" />,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {card.label}
              </p>
              <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${card.bg}`}>
                {card.icon}
              </span>
            </div>
            <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
              {card.value}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{card.sub}</p>
            <div className="mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-1 rounded-full transition-all duration-700"
                style={{ width: `${card.barPct}%`, background: card.color }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 5: Lead Status Breakdown + Activity Snapshot ── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Status Breakdown — "delete" status fully rendered */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <SectionTitle
            title="Lead Status Breakdown"
            sub="Current distribution across all statuses"
          />
          <div className="flex flex-col gap-3">
            {data.leadStatusBreakdown?.map((item) => {
              const pct = ((item.count / totalLeads) * 100).toFixed(1);
              const color = STATUS_COLORS[item.status] ?? "#6366f1";
              return (
                <div key={item.status}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize flex items-center gap-1.5">
                        {item.status}
                        {item.status === "delete" && (
                          <Trash2 className="w-3 h-3 text-slate-400" />
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {item.count.toLocaleString()}
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-10 text-right">
                        {pct}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-gray-100 dark:bg-gray-800">
                    <div
                      className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${parseFloat(pct)}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Activity Snapshot — all 8 metrics including previously missing ones */}
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <SectionTitle title="Activity Snapshot" sub="Key metrics at a glance" />
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Leads this month",
                value: fmt(data.leads?.thisMonth||0),
                color: "bg-indigo-50 dark:bg-indigo-950",
                text: "text-indigo-600 dark:text-indigo-400",
              },
              {
                label: "Deals opened",
                value: data.deals.thisMonth||0,
                color: "bg-pink-50 dark:bg-pink-950",
                text: "text-pink-600 dark:text-pink-400",
              },
              {
                label: "New users",
                value: data.users?.thisMonth||0,
                color: "bg-green-50 dark:bg-green-950",
                text: "text-green-600 dark:text-green-400",
              },
              {
                label: "Enquiries received",
                value: data.enquiries.thisMonth||0,
                color: "bg-orange-50 dark:bg-orange-950",
                text: "text-orange-600 dark:text-orange-400",
              },
              {
                label: "Won leads",
                value: data.leads.won,
                color: "bg-cyan-50 dark:bg-cyan-950",
                text: "text-cyan-600 dark:text-cyan-400",
              },
              // monthly revenue — previously missing
              {
                label: "Monthly revenue",
                value: fmtCurrency(data.deals?.monthlyRevenue||0),
                color: "bg-emerald-50 dark:bg-emerald-950",
                text: "text-emerald-600 dark:text-emerald-400",
              },
              // deleted leads — previously missing
              {
                label: "Deleted leads",
                value: data.leads.deleted||0,
                color: "bg-slate-100 dark:bg-slate-800",
                text: "text-slate-500 dark:text-slate-400",
              },
              // active enquiries — previously missing
              {
                label: "Active enquiries",
                value: data.enquiries.active,
                color: "bg-violet-50 dark:bg-violet-950",
                text: "text-violet-600 dark:text-violet-400",
              },
            ].map((item) => (
              <div key={item.label} className={`${item.color} rounded-xl p-3.5 flex flex-col gap-1`}>
                <span className={`font-mono text-xl font-bold ${item.text}`}>{item.value}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 ">
        <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 w-full">
          <div className="flex justify-between items-center">
            <SectionTitle title="Top Performer" sub="Sales team leaderboard this month" />
            <MdOutlineLeaderboard className="w-4 h-4 text-indigo-600 dark:text-indigo-400" onClick={() => setLeaderboard(true)} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {topPerformers.slice(0, 4).map((p, i) => (
              <div
                key={p.name}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <div className="relative mb-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-sm font-bold shadow-md">
                    {p.avatar}
                  </div>
                  {i === 0 && <span className="absolute -top-1.5 -right-1.5 text-base">🥇</span>}
                  {i === 1 && <span className="absolute -top-1.5 -right-1.5 text-base">🥈</span>}
                  {i === 2 && <span className="absolute -top-1.5 -right-1.5 text-base">🥉</span>}
                </div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white mb-0.5">{p.name}</p>
                <p className="text-xs text-slate-400 mb-2">{p.deals} deals closed</p>
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                  ${p.revenue.toLocaleString()}
                </p>
                <div className="w-full mt-3 bg-slate-200 dark:bg-gray-600 rounded-full h-1">
                  <div
                    className="h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${(p.revenue / topPerformers[0].revenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* ── Leaderboard Modal ── */}
      {leaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">

          {/* Modal */}
          <div className="w-full max-w-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                  Leaderboard
                </h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">
                  Top performers this month
                </p>
              </div>

              <button
                onClick={() => setLeaderboard(false)}
                className="text-gray-400 hover:text-red-500 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">

              {topPerformers.map((p, i) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all"
                >
                  {/* Left */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">
                      #{i + 1}
                    </span>

                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                      {p.avatar}
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.deals} deals closed
                      </p>
                    </div>
                  </div>

                  {/* Right */}
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                      ${p.revenue.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      Revenue
                    </p>
                  </div>
                </div>
              ))}

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button
                onClick={() => setLeaderboard(false)}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}