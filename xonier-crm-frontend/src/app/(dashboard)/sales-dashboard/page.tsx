"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePermissions } from "@/src/hooks/usePermissions";
import { MdOutlineLeaderboard } from "react-icons/md";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie,
} from "recharts";
import {
  Users, TrendingUp, MessageSquare, Handshake, RefreshCw,
  AlertCircle, ArrowUpRight, Activity, DollarSign, Trash2,
  BarChart2, ShieldCheck, ShieldOff, Lock,
} from "lucide-react";
import { DashboardService } from "@/src/services/dashboard.service";
import { PERMISSIONS } from "@/src/constants/enum";
import type {
  DashboardData, DealPipelineStage,
} from "@/src/types/dashboard/dashboard.types";
import Link from "next/link";
import { useRouter } from "next/navigation";

type DashboardFilter = "today" | "this_week" | "this_month" | "this_year";

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

const STATUS_COLORS: Record<string, string> = {
  new: "#6366f1", contacted: "#eab308", qualified: "#8b5cf6",
  proposal: "#06b6d4", won: "#22c55e", lost: "#ef4444", delete: "#94a3b8",
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
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n ?? 0);
}

function fmtCurrency(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(n ?? 0);
}

function relTime(iso: string): string {
  const date = new Date(iso.replace(" ", "T") + "Z");
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function capitalize(s: string): string {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

function UnauthorizedView() {
  return (
    <div className="mt-10 ml-72 min-h-screen">
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full">
        <div className="p-10 flex flex-col items-center text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-red-100 dark:bg-red-900/30 scale-[1.35] blur-xl opacity-60" />
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
            You don't have permission to view the sales dashboard. Contact your administrator to request access.
          </p>
          <div className="w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 text-left">
            <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
              Your current role does not include dashboard access. Reach out to your admin with your user ID.
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

export default function SalesDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [filter, setFilter] = useState<DashboardFilter>("this_month");
  const [refreshing, setRefreshing] = useState(false);
  const [trendTab, setTrendTab] = useState<"leads" | "deals">("leads");
  const [leaderboard, setLeaderboard] = useState(false);
  const { hasPermission } = usePermissions();

  const load = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setErrorStatus(null);

      const result = await DashboardService.getDashboardStats({ filter });

      if (result.status === 200) {
        setData(result.data.data);
      } else {
        throw new Error(result.data.message);
      }
    } catch (err: any) {
      const status = err?.response?.status ?? null;
      setErrorStatus(status);
      setError(err?.response?.data?.message ?? err?.message ?? "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const leads = data?.leads;
  const deals = data?.deals;
  const users = data?.users;
  const enquiries = data?.enquiries;
  const teams = data?.teams;

  const leadTrendData = data?.monthlyLeadTrend?.map((i) => ({
    month: `${i.month} ${i.year}`, leads: i.count,
  })) ?? [];

  const dealTrendData = data?.monthlyDealTrend?.map((i) => ({
    month: `${i.month} ${i.year}`, deals: i.count,
  })) ?? [];

  const sourceChartData = data?.leadSourceBreakdown
    ?.filter((s) => s.count > 0)
    .map((s) => ({ name: capitalize(s.source), value: s.count })) ?? [];

  const totalLeads = Math.max(leads?.total ?? 1, 1);
  

  const pipelineTotalAmount = data?.dealPipelineBreakdown?.reduce(
    (sum, p) => sum + p.totalAmount, 0
  ) ?? 0;

  const isAdmin = data?.role === "super_admin" || data?.role === "company_admin";

  if (loading) {
    return (
      <div className="mt-10 ml-72 flex flex-col gap-6 p-6 bg-gray-50 dark:bg-gray-700 min-h-screen">
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

  if (errorStatus === 403) return <UnauthorizedView />;

  if (error) {
    return (
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
  }

  // if (!data || !leads || !deals || !enquiries) return null;

 const isAdminRole = data?.role === "super_admin" || data?.role === "company_admin";

if (!data) return null;

if (!isAdminRole && (!leads || !deals || !enquiries)) return null; 

  const kpiCards = isAdmin ? [
    // {
    //   label: "Total Leads",
    //   value: fmt(leads.total),
    //   sub: `${fmt(leads.active)} active · ${leads.won} won · ${leads.deleted ?? 0} deleted`,
    //   barPct: Math.min((leads.active / totalLeads) * 100, 100),
    //   color: "#6366f1",
    //   icon: <TrendingUp className="w-4 h-4" />,
    //   iconBg: "bg-indigo-500",
    //   link: "/leads",
    //   show: hasPermission(PERMISSIONS.readLead),
    // },
    // {
    //   label: "Active Deals",
    //   value: deals.active,
    //   sub: `${fmtCurrency(pipelineTotalAmount)} pipeline · ${deals.closed} closed`,
    //   barPct: Math.min((deals.active / Math.max(deals.total, 1)) * 100, 100),
    //   color: "#ec4899",
    //   icon: <Handshake className="w-4 h-4" />,
    //   iconBg: "bg-pink-500",
    //   link: "/deals",
    //   show: hasPermission(PERMISSIONS.readDeal),
    // },
    // {
    //   label: "Total Users",
    //   value: users?.total ?? 0,
    //   sub: `${users?.thisMonth ?? 0} joined · ${users?.inactive ?? 0} inactive · ${users?.deleted ?? 0} deleted`,
    //   barPct: Math.min(((users?.active ?? 0) / Math.max(users?.total ?? 1, 1)) * 100, 100),
    //   color: "#22c55e",
    //   icon: <Users className="w-4 h-4" />,
    //   iconBg: "bg-green-500",
    //   link: "/users",
    //   show: isAdmin && hasPermission(PERMISSIONS.readUser),
    // },
    // {
    //   label: "Teams",
    //   value: teams?.totalTeams ?? 0,
    //   sub: `${teams?.activeTeams ?? 0} active · ${teams?.deletedTeams ?? 0} deleted`,
    //   barPct: Math.min(((teams?.activeTeams ?? 0) / Math.max(teams?.totalTeams ?? 1, 1)) * 100, 100),
    //   color: "#06b6d4",
    //   icon: <Users className="w-4 h-4" />,
    //   iconBg: "bg-cyan-500",
    //   link: "/teams",
    //   show: !isAdmin && hasPermission(PERMISSIONS.readTeam),
    // },
    // {
    //   label: "Enquiries",
    //   value: enquiries.total,
    //   sub: `${enquiries.assigned} assigned · ${enquiries.unassigned ?? 0} unassigned · ${enquiries.active ?? 0} active`,
    //   barPct: Math.min((enquiries.assigned / Math.max(enquiries.total, 1)) * 100, 100),
    //   color: "#f97316",
    //   icon: <MessageSquare className="w-4 h-4" />,
    //   iconBg: "bg-orange-500",
    //   link: "/enquiry",
    //   show: hasPermission(PERMISSIONS.readEnquiry),
    // },
          {
        label: "Total Companies",
        value: data.companies?.total ?? 0,
        sub: `${data.companies?.active ?? 0} active · ${data.companies?.deleted ?? 0} deleted`,
        barPct: Math.min(((data.companies?.active ?? 0) / Math.max(data.companies?.total ?? 1, 1)) * 100, 100),
        color: "#6366f1",
        icon: <Users className="w-4 h-4" />,
        iconBg: "bg-indigo-500",
        link: "/companies",
        show: true,
      },
      {
        label: "Total Users",
        value: data.users?.total ?? 0,
        sub: `${data.users?.thisMonth ?? 0} joined · ${data.users?.inactive ?? 0} inactive`,
        barPct: Math.min(((data.users?.active ?? 0) / Math.max(data.users?.total ?? 1, 1)) * 100, 100),
        color: "#22c55e",
        icon: <Users className="w-4 h-4" />,
        iconBg: "bg-green-500",
        link: "/users",
        show: hasPermission(PERMISSIONS.readUser),
      },
      {
        label: "Subscriptions",
        value: data.subscriptions?.active ?? 0,
        sub: `${data.subscriptions?.expiringSoon ?? 0} expiring soon`,
        barPct: 100,
        color: "#ec4899",
        icon: <DollarSign className="w-4 h-4" />,
        iconBg: "bg-pink-500",
        link: "/subscriptions",
        show: true,
      },

  ] :
  [
      // your existing non-admin cards
      {
        label: "Total Leads",
        value: fmt(leads?.total ?? 0),
        sub: `${fmt(leads?.active ?? 0)} active · ${leads?.won ?? 0} won`,
        barPct: Math.min(((leads?.active ?? 0) / Math.max(leads?.total ?? 1, 1)) * 100, 100),
        color: "#6366f1",
        icon: <TrendingUp className="w-4 h-4" />,
        iconBg: "bg-indigo-500",
        link: "/leads",
        show: hasPermission(PERMISSIONS.readLead),
      },
      // ... rest of your existing cards
    ]
  
  .filter((c) => c.show);

  console.log("kpiCards visible:", kpiCards.length, kpiCards.map(c => c.label));
console.log("data.role:", data?.role, "isAdmin:", isAdmin);

  return (
    
    <div className="mt-10 ml-72">
      
      <div className="bg-white mb-10 dark:bg-gray-700 dark:backdrop-blur-sm p-6 rounded-xl border border-slate-900/10 w-full flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">
              {isAdmin ? "Sales Dashboard" : `Welcome Back, ${data.user?.firstName ?? ""} ${data.user?.lastName ?? ""}`}
            </h1>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-2">
              {new Date(data.period.start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              {" – "}
              {new Date(data.period.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950 text-indigo-500 dark:text-indigo-400 text-[10px] font-semibold uppercase tracking-wide">
                {data.period.filter.replace(/_/g, " ")}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-xl p-1 gap-0.5">
              {(["today", "this_week", "this_month", "this_year"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all duration-200 ${
                    filter === f
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
              className="p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <Link key={card.label} href={card.link}>
              <div className="relative overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow duration-200">
                <div className="flex items-start justify-between mb-3">
                  <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{card.label}</p>
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${card.iconBg}`}>
                    {card.icon}
                  </span>
                </div>
                <p className="font-mono text-3xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">
                  {card.value}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5 leading-relaxed">{card.sub}</p>
                <div className="mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                  <div className="h-1 rounded-full transition-all duration-700"
                    style={{ width: `${card.barPct}%`, background: card.color }} />
                </div>
              </div>
            </Link>
          ))}
        </div>


        {leads && deals && enquiries ? (
          <>
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
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
                  {trendTab === "leads" ? fmt(leads.thisMonth) : deals.thisMonth} this month
                </span>
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5">
                  {(["leads", "deals"] as const).map((tab) => (
                    <button key={tab} onClick={() => setTrendTab(tab)}
                      className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-all duration-200 ${
                        trendTab === tab
                          ? "bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-sm"
                          : "text-gray-500 dark:text-gray-400"
                      }`}>
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
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={48} tickFormatter={fmt} />
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

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <SectionTitle title="Lead Sources" sub="Distribution by channel" />
            {sourceChartData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie data={sourceChartData} cx="50%" cy="50%" innerRadius={45} outerRadius={68}
                      dataKey="value" strokeWidth={0} paddingAngle={3}>
                      {sourceChartData.map((_, i) => (
                        <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [value?.toLocaleString?.() ?? "0", ""]}
                      contentStyle={{ background: "white", border: "1px solid #f1f5f9", borderRadius: "12px", fontSize: "12px" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-1.5 mt-2">
                  {sourceChartData.slice(0, 5).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                        <span className="text-xs text-gray-500 dark:text-gray-400">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-400 dark:text-gray-500">{item.value.toLocaleString()}</span>
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

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
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
                data={(data.dealPipelineBreakdown ?? []).map((p) => ({
                  stage: capitalize(p.pipeline).split(" ")[0],
                  count: p.count,
                  amount: p.totalAmount,
                }))}
                layout="vertical"
                margin={{ left: 10, right: 10, top: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={65} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                  {(data.dealPipelineBreakdown ?? []).map((p, i) => (
                    <Cell key={i} fill={PIPELINE_COLORS[p.pipeline as DealPipelineStage] ?? "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="col-span-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-800 dark:text-white">Latest Leads</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Most recent pipeline entries</p>
              </div>
              {hasPermission(PERMISSIONS.readLead) && (
                <Link href="/leads">
                  <button className="flex items-center gap-1 text-xs font-semibold text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    View all <ArrowUpRight className="w-3 h-3" />
                  </button>
                </Link>
              )}
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800">
                  {["Lead ID", "Source", "Status", "Time"].map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-400 dark:text-gray-500 pb-3 pr-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {(data.latestLeads ?? []).map((lead, i) => (
                  <tr key={lead.lead_id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 ${AVATAR_BG[i % AVATAR_BG.length]}`}>
                          {(lead.source || "?").charAt(0).toUpperCase()}
                        </div>
                        <Link href={`/leads/view/${lead._id}`} className="text-xs font-mono text-gray-500 dark:text-gray-400 truncate max-w-[130px]">
                          {lead.lead_id}
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

        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: "Total Revenue",
              value: fmtCurrency(deals.totalRevenue ?? 0),
              sub: "Across all closed deals",
              color: "#22c55e", bg: "bg-emerald-500",
              barPct: (deals.totalRevenue ?? 0) > 0 ? 100 : 0,
              icon: <DollarSign className="w-4 h-4" />,
            },
            {
              label: "Monthly Revenue",
              value: fmtCurrency(deals.periodRevenue ?? 0),
              sub: "Revenue this period",
              color: "#8b5cf6", bg: "bg-violet-500",
              barPct: (deals.periodRevenue ?? 0) > 0 ? 100 : 0,
              icon: <BarChart2 className="w-4 h-4" />,
            },
            {
              label: "Pipeline Value",
              value: fmtCurrency(pipelineTotalAmount),
              sub: `Across ${deals.active} active deals`,
              color: "#ec4899", bg: "bg-pink-500",
              barPct: pipelineTotalAmount > 0 ? 100 : 0,
              icon: <ShieldCheck className="w-4 h-4" />,
            },
          ].map((card) => (
            <div key={card.label}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow duration-200">
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{card.label}</p>
                <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${card.bg}`}>
                  {card.icon}
                </span>
              </div>
              <p className="font-mono text-2xl font-bold text-gray-900 dark:text-white tracking-tight leading-none">{card.value}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">{card.sub}</p>
              <div className="mt-4 h-1 rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-1 rounded-full transition-all duration-700" style={{ width: `${card.barPct}%`, background: card.color }} />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <SectionTitle title="Lead Status Breakdown" sub="Current distribution across all statuses" />
            <div className="flex flex-col gap-3">
              {(data.leadStatusBreakdown ?? []).map((item) => {
                const pct = ((item.count / totalLeads) * 100).toFixed(1);
                const color = STATUS_COLORS[item.status] ?? "#6366f1";
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize flex items-center gap-1.5">
                          {item.status}
                          {item.status === "delete" && <Trash2 className="w-3 h-3 text-slate-400" />}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{item.count.toLocaleString()}</span>
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-10 text-right">{pct}%</span>
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
          </div>

          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
            <SectionTitle title="Activity Snapshot" sub="Key metrics at a glance" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Leads this month", value: fmt(leads.thisMonth ?? 0), color: "bg-indigo-50 dark:bg-indigo-950", text: "text-indigo-600 dark:text-indigo-400", link: "/leads", show: hasPermission(PERMISSIONS.readLead) },
                { label: "Deals opened", value: deals.thisMonth ?? 0, color: "bg-pink-50 dark:bg-pink-950", text: "text-pink-600 dark:text-pink-400", link: "/deals", show: hasPermission(PERMISSIONS.readDeal) },
                { label: "New users", value: users?.thisMonth ?? 0, color: "bg-green-50 dark:bg-green-950", text: "text-green-600 dark:text-green-400", link: "/users", show: hasPermission(PERMISSIONS.readUser) },
                { label: "Enquiries received", value: enquiries.thisMonth ?? 0, color: "bg-orange-50 dark:bg-orange-950", text: "text-orange-600 dark:text-orange-400", link: "/enquiry", show: hasPermission(PERMISSIONS.readEnquiry) },
                { label: "Won leads", value: leads.won ?? 0, color: "bg-cyan-50 dark:bg-cyan-950", text: "text-cyan-600 dark:text-cyan-400", link: "/leads", show: hasPermission(PERMISSIONS.readLead) },
                { label: "Monthly revenue", value: fmtCurrency(deals.periodRevenue ?? 0), color: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-600 dark:text-emerald-400", link: "/deals", show: hasPermission(PERMISSIONS.readDeal) },
                { label: "Deleted leads", value: leads.deleted ?? 0, color: "bg-slate-100 dark:bg-slate-800", text: "text-slate-500 dark:text-slate-400", link: "/leads", show: hasPermission(PERMISSIONS.readLead) },
                { label: "Active enquiries", value: enquiries.active ?? 0, color: "bg-violet-50 dark:bg-violet-950", text: "text-violet-600 dark:text-violet-400", link: "/enquiry", show: hasPermission(PERMISSIONS.readEnquiry) },
              ].filter((i) => i.show).map((item) => (
                <Link key={item.label} href={item.link}>
                  <div className={`${item.color} rounded-xl p-3.5 flex flex-col gap-1 hover:shadow-md dark:hover:shadow-gray-900 transition-shadow duration-200`}>
                    <span className={`font-mono text-xl font-bold ${item.text}`}>{item.value}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
        </>

        ) : isAdmin ? (
  // Super admin sees a placeholder where lead/deal sections would be
  <div className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-2">
    <ShieldCheck className="w-8 h-8 text-indigo-400" />
    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Admin Overview</p>
    <p className="text-xs text-gray-400 dark:text-gray-500 text-center max-w-sm">
      Lead and deal analytics are available at the company level. Select a company to drill down.
    </p>
  </div>
) : null}

        <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-2xl p-5">
          <div className="flex justify-between items-center mb-4">
            <SectionTitle title="Top Performers" sub="Sales team leaderboard this month" />
            <MdOutlineLeaderboard
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 cursor-pointer"
              onClick={() => setLeaderboard(true)}
            />
          </div>
          <div className="grid grid-cols-4 gap-4">
            {topPerformers.slice(0, 4).map((p, i) => (
              <div key={p.name}
                className="flex flex-col items-center text-center p-4 rounded-xl bg-slate-50 dark:bg-gray-700 hover:bg-indigo-50 dark:hover:bg-gray-600 transition-colors duration-200">
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
                <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">${p.revenue.toLocaleString()}</p>
                <div className="w-full mt-3 bg-slate-200 dark:bg-gray-600 rounded-full h-1">
                  <div className="h-1 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${(p.revenue / topPerformers[0].revenue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {leaderboard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div>
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Leaderboard</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500">Top performers this month</p>
              </div>
              <button onClick={() => setLeaderboard(false)} className="text-gray-400 hover:text-red-500 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto">
              {topPerformers.map((p, i) => (
                <div key={p.name}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 transition-all">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-6">#{i + 1}</span>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold">
                      {p.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-white">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.deals} deals closed</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">${p.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">Revenue</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
              <button onClick={() => setLeaderboard(false)}
                className="px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}