"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend,
} from "recharts";
import {
  RefreshCw, AlertCircle, Building2, Users, DollarSign,
  TrendingUp, TrendingDown, Activity, Crown, Shield, Briefcase,
  Target, Award, CheckCircle2, XCircle, Clock, Zap, Globe,
  ArrowUpRight, ArrowDownRight, BarChart3, PieChart as PieIcon,
  UserCheck, Layers, Star, ChevronRight, Package,
} from "lucide-react";
import { DashboardService } from "@/src/services/dashboard.service";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";

// ── Types ──────────────────────────────────────────────────────────────────────

interface DashboardData {
  role: string;
  period: { filter: string; start: string; end: string; year: number; generatedAt: string };
  companies?: CompanyStats;
  users?: UserStats;
  subscriptions?: SubscriptionStats;
  revenue?: RevenueStats;
  plans?: PlanStat[];
  activity?: ActivityStats;
  trends?: TrendsStats;
  breakdowns?: BreakdownStats;
  latestCompanies?: LatestCompany[];
  topCompaniesByUsers?: TopCompany[];
  recentActivities?: RecentActivity[];
  churn?: ChurnStats;
  leads?: LeadStats;
  deals?: DealStats;
  enquiries?: EnquiryStats;
  tasks?: TaskStats;
  monthlyLeadTrend?: MonthlyTrend[];
  monthlyDealTrend?: MonthlyTrend[];
  leadSourceBreakdown?: SourceItem[];
  dealPipelineBreakdown?: PipelineStage[];
  topPerformers?: TopPerformer[];
  conversionRate?: ConversionRate;
  taskPriorityBreakdown?: PriorityItem[];
  enabledFeatures?: string[];
}

type DashboardFilter = "today" | "this_week" | "this_month" | "this_year" | "custom";

interface CompanyStats { total: number; thisMonth: number; active: number; pending: number; suspended: number; inactive: number; deleted: number }
interface UserStats { total: number; thisMonth: number; active: number; inactive: number; suspended: number; deleted: number; notVerified: number; superAdmins?: number }
interface SubscriptionStats { total: number; active: number; trial: number; canceled: number; thisMonth: number; mrr: number; totalRevenue: number; periodRevenue: number; avgRevenue: number }
interface RevenueStats { mrr: number; arr: number; monthlyTrend: { month: string; year: number; revenue: number; subscriptions: number }[] }
interface PlanStat { planId: string; name: string; status: string; visibility: string; monthlyPrice: number; yearlyPrice: number; activeSubscriptions: number }
interface ActivityStats { total: number; thisMonth: number; byAction: { action: string; count: number }[]; byEntity: { entityType: string; count: number }[] }
interface TrendsStats { monthlyCompanies: MonthlyTrend[]; monthlyUsers: MonthlyTrend[] }
interface BreakdownStats {
  companiesByStatus: { status: string; count: number }[];
  companiesByIndustry: { industry: string; count: number }[];
  companiesByCountry: { country: string; count: number }[];
  subscriptionsByPlan: { planId: string; planName: string; count: number; revenue: number }[];
  subscriptionsByBillingCycle: { cycle: string; count: number; revenue: number }[];
}
interface LatestCompany { companyId: string; companyName: string; industry: string; country?: string; status: string; subscriptionCount: number; userLimit?: number; createdAt: string }
interface TopCompany { companyName: string; companyId: string; industry: string; status: string; userCount: number; userLimit?: number }
interface RecentActivity { entityType: string; action: string; title: string; description?: string; ipAddress?: string; createdAt: string }
interface ChurnStats { canceledThisPeriod: number; newThisPeriod: number; churnRate: number; revenueLost: number }
interface LeadStats { total: number; thisMonth: number; active: number; won: number; lost: number; deleted: number; unassigned: number; inDeal: number }
interface DealStats { total: number; thisMonth: number; active: number; closed: number; totalRevenue: number; periodRevenue: number; avgDealValue: number }
interface EnquiryStats { total: number; thisMonth: number; assigned: number; unassigned: number; active: number }
interface TaskStats { total: number; thisMonth: number; completed: number; overdue: number; unassigned: number; completionRate: number }
interface MonthlyTrend { month: string; year: number; count: number }
interface SourceItem { source: string; count: number }
interface PipelineStage { pipeline: string; count: number; totalAmount: number; percentage: number }
interface TopPerformer { userId: string; firstName: string; lastName: string; wonLeads: number }
interface ConversionRate { total: number; won: number; lost: number; conversionRate: number }
interface PriorityItem { priority: string; count: number }

// ── Constants ──────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  super_admin: { label: "Super Admin", icon: Crown, gradient: "from-amber-500 to-orange-600", badge: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
  company_admin: { label: "Company Admin", icon: Shield, gradient: "from-indigo-600 to-violet-700", badge: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400" },
  manager: { label: "Manager", icon: Briefcase, gradient: "from-blue-600 to-cyan-700", badge: "bg-blue-500/15 border-blue-500/30 text-blue-400" },
  user: { label: "User", icon: UserCheck, gradient: "from-emerald-600 to-teal-700", badge: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
};

const FILTER_OPTIONS: { value: DashboardFilter; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "Week" },
  { value: "this_month", label: "Month" },
  { value: "this_year", label: "Year" },
];

const CHART_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f97316", "#22c55e", "#06b6d4", "#eab308", "#a855f7"];
const PIPELINE_COLORS: Record<string, string> = {
  qualification: "#6366f1", requirement_analysis: "#8b5cf6", proposal: "#a78bfa",
  negotiation: "#f59e0b", won: "#10b981", lost: "#ef4444",
};
const PRIORITY_COLORS: Record<string, string> = {
  urgent: "#ef4444", high: "#f97316", medium: "#eab308", low: "#22c55e",
};
const ACTION_COLORS: Record<string, string> = {
  login: "#6366f1", logout: "#94a3b8", created: "#10b981", updated: "#f59e0b",
  deleted: "#ef4444", assigned: "#06b6d4", verified: "#8b5cf6",
};
const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", pending: "#f59e0b", pending_verification: "#f59e0b",
  suspended: "#ef4444", inactive: "#f97316", deleted: "#6b7280",
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n ?? 0);
}
function cap(s: string): string {
  return (s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Animation Hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1000) {
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);
  const startRef = useRef<number>(0);
  useEffect(() => {
    if (!target) { setValue(0); return; }
    startRef.current = 0;
    const step = (ts: number) => {
      if (!startRef.current) startRef.current = ts;
      const p = Math.min((ts - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(eased * target));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [target, duration]);
  return value;
}

// ── Shared Components ──────────────────────────────────────────────────────────

const Tooltip_ = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 shadow-2xl text-xs">
      <p className="font-semibold text-slate-200 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="capitalize">{p.name}:</span>
          <span className="font-bold text-slate-200">{typeof p.value === "number" ? p.value.toLocaleString() : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const Sk = ({ className }: { className?: string }) => (
  <div className={`animate-pulse rounded-2xl bg-slate-800/60 ${className ?? ""}`} />
);

function AnimNum({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const v = useCountUp(value);
  return <span>{prefix}{v.toLocaleString()}{suffix}</span>;
}

function Ring({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.min(pct, 100) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1e293b" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)" }} />
    </svg>
  );
}

function MetricRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const v = useCountUp(value);
  const p = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs text-slate-400 capitalize group-hover:text-slate-300 transition-colors">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-300">{v}</span>
          <span className="text-xs text-slate-600 w-9 text-right">{p.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-slate-700/60">
        <div className="h-1 rounded-full transition-all duration-1000" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, color, trend, prefix = "", suffix = "" }:
  { label: string; value: number; sub?: string; icon: any; color: string; trend?: { val: number; up: boolean }; prefix?: string; suffix?: string }) {
  const v = useCountUp(value);
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-800/80 p-5 hover:border-slate-600 transition-all duration-300 hover:shadow-lg hover:shadow-slate-900/50 group cursor-default">
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at top right, ${color}12, transparent 70%)` }} />
      <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-full opacity-5 group-hover:opacity-10 transition-opacity duration-500"
        style={{ backgroundColor: color }} />
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ backgroundColor: color }}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <p className="font-mono text-3xl font-bold text-white tracking-tight leading-none mb-1">
          {prefix}{v.toLocaleString()}{suffix}
        </p>
        {sub && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${trend.up ? "text-emerald-400" : "text-red-400"}`}>
            {trend.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend.val}% vs last period
          </div>
        )}
      </div>
    </div>
  );
}

// ── Card Wrapper ───────────────────────────────────────────────────────────────

function Card({ title, sub, icon: Icon, children, className = "" }:
  { title: string; sub?: string; icon?: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-slate-800/80 border border-slate-700/50 rounded-2xl p-5 hover:border-slate-600/60 transition-all duration-200 ${className}`}>
      {(title || Icon) && (
        <div className="flex items-start gap-2.5 mb-5">
          {Icon && <div className="w-7 h-7 rounded-lg bg-slate-700/60 flex items-center justify-center text-slate-400 flex-shrink-0 mt-0.5"><Icon className="w-3.5 h-3.5" /></div>}
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
            {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
          </div>
        </div>
      )}
      {children}
    </div>
  );
}

// ── Filter Bar ─────────────────────────────────────────────────────────────────

function FilterBar({ current, onChange }: {
  current: DashboardFilter;
  onChange: (f: DashboardFilter) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-800/60 border border-slate-700/50 rounded-xl p-1">
      {FILTER_OPTIONS.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value as DashboardFilter)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
            current === o.value ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"
          }`}>{o.label}</button>
      ))}
    </div>
  );
}

// ── Super Admin Sections ───────────────────────────────────────────────────────

function SACompaniesCard({ companies }: { companies: CompanyStats }) {
  return (
    <Card title="Companies" sub="Platform company status" icon={Building2}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "Total", value: companies.total, color: "#6366f1" },
          { label: "Active", value: companies.active, color: "#10b981" },
          { label: "Pending", value: companies.pending, color: "#f59e0b" },
          { label: "Suspended", value: companies.suspended, color: "#ef4444" },
        ].map((i) => (
          <div key={i.label} className="rounded-xl p-3 border border-slate-700/40 hover:border-slate-600 transition-colors"
            style={{ background: `linear-gradient(135deg, ${i.color}12, ${i.color}05)` }}>
            <p className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <MetricRow label="Active" value={companies.active} total={companies.total + companies.deleted} color="#10b981" />
        <MetricRow label="Pending" value={companies.pending} total={companies.total + companies.deleted} color="#f59e0b" />
        <MetricRow label="Deleted" value={companies.deleted} total={companies.total + companies.deleted} color="#6b7280" />
      </div>
    </Card>
  );
}

function SARevenueCard({ subs, revenue }: { subs: SubscriptionStats; revenue: RevenueStats }) {
  return (
    <Card title="Revenue" sub="Subscription financials" icon={DollarSign}>
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">MRR</p>
        <p className="font-mono text-4xl font-bold text-emerald-400">{fmtMoney(revenue.mrr)}</p>
        <p className="text-xs text-slate-500 mt-1">ARR: <span className="text-emerald-400 font-semibold">{fmtMoney(revenue.arr)}</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Total Revenue", value: fmtMoney(subs.totalRevenue), color: "#10b981" },
          { label: "Period Revenue", value: fmtMoney(subs.periodRevenue), color: "#6366f1" },
          { label: "Active Subs", value: fmt(subs.active), color: "#8b5cf6" },
          { label: "Avg Revenue", value: fmtMoney(subs.avgRevenue), color: "#f59e0b" },
        ].map((i) => (
          <div key={i.label} className="rounded-xl p-2.5 bg-slate-700/30 border border-slate-700/40">
            <p className="font-mono text-base font-bold" style={{ color: i.color }}>{i.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-700/40">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Trial</span>
          <span className="font-mono font-bold text-amber-400">{subs.trial}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">Canceled</span>
          <span className="font-mono font-bold text-red-400">{subs.canceled}</span>
        </div>
      </div>
    </Card>
  );
}

function SAPlansCard({ plans }: { plans: PlanStat[] }) {
  const active = plans.filter((p) => p.status === "active");
  return (
    <Card title="Plans" sub="Subscription plan distribution" icon={Package}>
      <div className="flex flex-col gap-2">
        {plans.slice(0, 5).map((plan, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={plan.planId}
              className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-700/30 border border-slate-700/40 hover:border-slate-600 transition-all group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}>
                {(plan.name || "P")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{plan.name}</p>
                <p className="text-[10px] text-slate-600">${plan.monthlyPrice}/mo · ${plan.yearlyPrice}/yr</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold" style={{ color }}>{plan.activeSubscriptions}</p>
                <p className="text-[10px] text-slate-600">subs</p>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${plan.status === "active" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                {plan.status}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SAChurnCard({ churn }: { churn: ChurnStats }) {
  return (
    <Card title="Churn Analysis" sub="Subscription health" icon={TrendingDown}>
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Churn Rate", value: `${churn.churnRate.toFixed(1)}%`, color: churn.churnRate > 5 ? "#ef4444" : "#10b981", bg: "from-red-500/10 to-rose-500/5" },
          { label: "Revenue Lost", value: fmtMoney(churn.revenueLost), color: "#ef4444", bg: "from-red-500/10 to-rose-500/5" },
          { label: "Canceled", value: String(churn.canceledThisPeriod), color: "#f97316", bg: "from-orange-500/10 to-amber-500/5" },
          { label: "New This Period", value: String(churn.newThisPeriod), color: "#10b981", bg: "from-emerald-500/10 to-green-500/5" },
        ].map((i) => (
          <div key={i.label} className={`rounded-xl p-3.5 border border-slate-700/40 bg-gradient-to-br ${i.bg}`}>
            <p className="font-mono text-xl font-bold" style={{ color: i.color }}>{i.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SALatestCompanies({ companies }: { companies: LatestCompany[] }) {
  return (
    <Card title="Latest Companies" sub="5 most recently registered" icon={Building2}>
      <div className="flex flex-col gap-2">
        {companies.map((c, i) => {
          const color = STATUS_COLORS[c.status] ?? "#6b7280";
          return (
            <div key={c.companyId} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-700/30 border border-slate-700/40 hover:border-slate-600 transition-all group">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[i % CHART_COLORS.length]}80)` }}>
                {(c.companyName || "C")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{c.companyName}</p>
                <p className="text-[10px] text-slate-600 truncate">{c.industry} {c.country ? `· ${c.country}` : ""}</p>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
                style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                {c.status}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SATopCompanies({ companies }: { companies: TopCompany[] }) {
  const max = Math.max(...companies.map((c) => c.userCount), 1);
  return (
    <Card title="Top Companies by Users" sub="Most active tenants" icon={Award}>
      <div className="flex flex-col gap-3">
        {companies.map((c, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          const pct = (c.userCount / max) * 100;
          const medals = ["🥇", "🥈", "🥉", "4th", "5th"];
          return (
            <div key={c.companyId} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/30 transition-colors">
              <span className="text-sm w-6 text-center flex-shrink-0">{medals[i]}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                style={{ backgroundColor: color }}>
                {(c.companyName || "C")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-300 truncate">{c.companyName}</p>
                <div className="mt-1 h-1 rounded-full bg-slate-700/60">
                  <div className="h-1 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </div>
              <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color }}>{c.userCount}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SAActivityCard({ activity }: { activity: ActivityStats }) {
  return (
    <Card title="Platform Activity" sub="System-wide action breakdown" icon={Activity}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">By Action</p>
          <div className="flex flex-col gap-2">
            {activity.byAction.map((a, i) => {
              const color = ACTION_COLORS[a.action] ?? CHART_COLORS[i % CHART_COLORS.length];
              const total = activity.byAction.reduce((s, x) => s + x.count, 0);
              const p = total > 0 ? (a.count / total) * 100 : 0;
              return (
                <div key={a.action}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 capitalize">{a.action}</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{a.count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-700/60">
                    <div className="h-1 rounded-full" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">By Entity</p>
          <div className="flex flex-col gap-2">
            {activity.byEntity.map((e, i) => {
              const color = CHART_COLORS[i % CHART_COLORS.length];
              const total = activity.byEntity.reduce((s, x) => s + x.count, 0);
              const p = total > 0 ? (e.count / total) * 100 : 0;
              return (
                <div key={e.entityType}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-400 capitalize">{e.entityType}</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{e.count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-700/60">
                    <div className="h-1 rounded-full" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-700/40 flex items-center justify-between">
        <span className="text-xs text-slate-500">Total actions</span>
        <span className="text-sm font-mono font-bold text-indigo-400">{activity.total.toLocaleString()}</span>
      </div>
    </Card>
  );
}

function SARecentActivities({ activities }: { activities: RecentActivity[] }) {
  return (
    <Card title="Recent Activities" sub="Latest system events" icon={Clock}>
      <div className="flex flex-col gap-0">
        {activities.slice(0, 8).map((a, i) => {
          const color = ACTION_COLORS[a.action] ?? "#6366f1";
          return (
            <div key={i} className="flex gap-3 relative group">
              {i < Math.min(activities.length, 8) - 1 && (
                <div className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-700/60" />
              )}
              <div className="w-4.5 h-4.5 mt-1 rounded-full border-2 border-slate-800 flex items-center justify-center z-10 flex-shrink-0"
                style={{ backgroundColor: `${color}25`, borderColor: color }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
              </div>
              <div className="pb-3 flex-1 min-w-0">
                <p className="text-xs text-slate-300 leading-relaxed font-medium">{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ color, backgroundColor: `${color}15` }}>
                    {cap(a.action)}
                  </span>
                  <span className="text-[10px] text-slate-600 capitalize">{a.entityType}</span>
                  <span className="text-[10px] text-slate-600 ml-auto">{relTime(a.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Shared CRM/Company Admin Sections ─────────────────────────────────────────

function LeadsCard({ leads }: { leads: LeadStats }) {
  const wonPct = leads.total > 0 ? (leads.won / leads.total) * 100 : 0;
  return (
    <Card title="Lead Pipeline" sub="Status and conversion" icon={Target}>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <Ring pct={wonPct} color="#10b981" size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xs font-bold text-white">{wonPct.toFixed(0)}%</span>
            <span className="text-[9px] text-slate-500">won</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <MetricRow label="Won" value={leads.won} total={leads.total} color="#10b981" />
          <MetricRow label="Active" value={leads.active} total={leads.total} color="#6366f1" />
          <MetricRow label="Lost" value={leads.lost} total={leads.total} color="#ef4444" />
          <MetricRow label="Unassigned" value={leads.unassigned} total={leads.total} color="#f59e0b" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-700/40">
        {[
          { label: "Total", value: leads.total, color: "#6366f1" },
          { label: "In Deal", value: leads.inDeal, color: "#8b5cf6" },
          { label: "This Month", value: leads.thisMonth, color: "#06b6d4" },
        ].map((i) => (
          <div key={i.label} className="text-center rounded-xl p-2 bg-slate-700/30">
            <p className="font-mono text-base font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DealsCard({ deals }: { deals: DealStats }) {
  const closedPct = deals.total > 0 ? (deals.closed / deals.total) * 100 : 0;
  return (
    <Card title="Deal Revenue" sub="Financial performance" icon={DollarSign}>
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Total Revenue</p>
        <p className="font-mono text-4xl font-bold text-emerald-400">{fmtMoney(deals.totalRevenue)}</p>
        <p className="text-xs text-slate-500 mt-1">Period: <span className="text-emerald-400 font-semibold">{fmtMoney(deals.periodRevenue)}</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Active", value: deals.active, color: "#6366f1" },
          { label: "Closed", value: deals.closed, color: "#10b981" },
          { label: "Total", value: deals.total, color: "#8b5cf6" },
          { label: "This Month", value: deals.thisMonth, color: "#06b6d4" },
        ].map((i) => (
          <div key={i.label} className="rounded-xl p-2.5 bg-slate-700/30 border border-slate-700/40">
            <p className="font-mono text-lg font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-700/40">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">Close Rate</span>
          <span className="font-mono text-emerald-400">{closedPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700/60">
          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(closedPct, 100)}%` }} />
        </div>
        <div className="flex justify-between text-xs mt-2">
          <span className="text-slate-500">Avg Deal</span>
          <span className="font-mono text-amber-400">{fmtMoney(deals.avgDealValue)}</span>
        </div>
      </div>
    </Card>
  );
}

function ConversionCard({ conv }: { conv: ConversionRate }) {
  return (
    <Card title="Conversion Funnel" sub="Lead-to-won rate" icon={TrendingUp}>
      <div className="flex items-center justify-center mb-5">
        <div className="relative">
          <Ring pct={conv.conversionRate} color="#6366f1" size={110} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-2xl font-bold text-white">{conv.conversionRate.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500">conversion</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: conv.total, color: "#6366f1", icon: Target },
          { label: "Won", value: conv.won, color: "#10b981", icon: CheckCircle2 },
          { label: "Lost", value: conv.lost, color: "#ef4444", icon: XCircle },
        ].map((i) => (
          <div key={i.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-700/30 border border-slate-700/40">
            <i.icon className="w-4 h-4" style={{ color: i.color }} />
            <span className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></span>
            <span className="text-[10px] text-slate-500">{i.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PipelineChart({ pipeline }: { pipeline: PipelineStage[] }) {
  return (
    <Card title="Deal Pipeline" sub="Stage distribution" icon={Layers}>
      <div className="flex flex-col gap-2.5 mb-4">
        {pipeline.map((s) => {
          const color = PIPELINE_COLORS[s.pipeline] ?? "#6366f1";
          return (
            <div key={s.pipeline} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-400 capitalize group-hover:text-slate-300 transition-colors">
                    {cap(s.pipeline)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{fmtMoney(s.totalAmount)}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{s.count}</span>
                  <span className="text-xs text-slate-600 w-9 text-right">{s.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-slate-700/60">
                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(s.percentage, 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={pipeline.map((s) => ({ name: cap(s.pipeline).split(" ")[0], count: s.count }))}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} width={20} />
          <Tooltip content={<Tooltip_ />} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {pipeline.map((s, i) => <Cell key={i} fill={PIPELINE_COLORS[s.pipeline] ?? "#6366f1"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function TopPerformers({ performers }: { performers: TopPerformer[] }) {
  const max = Math.max(...performers.map((p) => p.wonLeads), 1);
  const medals = ["🥇", "🥈", "🥉", "4th", "5th"];
  const colors = ["#f59e0b", "#94a3b8", "#cd7c4c", "#6366f1", "#8b5cf6"];
  return (
    <Card title="Top Performers" sub="Ranked by won leads" icon={Award}>
      <div className="flex flex-col gap-2">
        {performers.slice(0, 5).map((p, i) => (
          <div key={p.userId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-700/30 transition-colors group">
            <span className="text-sm w-6 text-center">{medals[i]}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${colors[i]}, ${colors[i]}80)` }}>
              {(p.firstName || "?")[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-300 truncate">{p.firstName} {p.lastName}</p>
              <div className="mt-1 h-1 rounded-full bg-slate-700/60">
                <div className="h-1 rounded-full" style={{ width: `${(p.wonLeads / max) * 100}%`, backgroundColor: colors[i] }} />
              </div>
            </div>
            <span className="text-xs font-mono font-bold flex-shrink-0" style={{ color: colors[i] }}>{p.wonLeads}</span>
          </div>
        ))}
        {performers.length === 0 && (
          <div className="flex flex-col items-center py-8 text-slate-600">
            <Award className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs">No data yet</p>
          </div>
        )}
      </div>
    </Card>
  );
}

function UsersCard({ users }: { users: UserStats }) {
  return (
    <Card title="Team Overview" sub="User distribution" icon={Users}>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: "Total", value: users.total, color: "#6366f1" },
          { label: "Active", value: users.active, color: "#10b981" },
          { label: "Inactive", value: users.inactive, color: "#f59e0b" },
          { label: "Not Verified", value: users.notVerified, color: "#ef4444" },
        ].map((i) => (
          <div key={i.label} className="rounded-xl p-3 border border-slate-700/40"
            style={{ background: `linear-gradient(135deg, ${i.color}12, ${i.color}05)` }}>
            <p className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <MetricRow label="Active" value={users.active} total={users.total} color="#10b981" />
        <MetricRow label="Inactive" value={users.inactive} total={users.total} color="#f59e0b" />
        <MetricRow label="Suspended" value={users.suspended} total={users.total} color="#ef4444" />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700/40 flex justify-between text-xs">
        <span className="text-slate-500">This month</span>
        <span className="font-bold text-indigo-400">+{users.thisMonth} new</span>
      </div>
    </Card>
  );
}

function TaskCard({ tasks }: { tasks: TaskStats }) {
  return (
    <Card title="Task Pulse" sub="Completion metrics" icon={CheckCircle2}>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <Ring pct={tasks.completionRate} color="#10b981" size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xs font-bold text-white">{tasks.completionRate.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">Completion Rate</p>
          <p className="text-sm font-bold text-emerald-400">{tasks.completionRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-600 mt-1">{tasks.completed} of {tasks.total}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Overdue", value: tasks.overdue, color: "#ef4444" },
          { label: "Unassigned", value: tasks.unassigned, color: "#f59e0b" },
          { label: "This Month", value: tasks.thisMonth, color: "#6366f1" },
        ].map((i) => (
          <div key={i.label} className="text-center rounded-xl p-2 bg-slate-700/30">
            <p className="font-mono text-lg font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MonthlyTrendChart({ leads, deals }: { leads?: MonthlyTrend[]; deals?: MonthlyTrend[] }) {
  const allMonths = Array.from(new Set([...(leads ?? []), ...(deals ?? [])].map((d) => d.month)));
  const merged = allMonths.map((month) => ({
    month,
    leads: leads?.find((l) => l.month === month)?.count ?? 0,
    deals: deals?.find((d) => d.month === month)?.count ?? 0,
  }));
  return (
    <Card title="Monthly Growth" sub="Leads vs deals per month" icon={BarChart3}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={merged} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
          <Tooltip content={<Tooltip_ />} />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "#94a3b8" }} />
          <Area type="monotone" dataKey="leads" stroke="#6366f1" strokeWidth={2.5} fill="url(#gL)" dot={false} activeDot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} />
          <Area type="monotone" dataKey="deals" stroke="#10b981" strokeWidth={2.5} fill="url(#gD)" dot={false} activeDot={{ r: 4, fill: "#10b981", strokeWidth: 0 }} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function SAMonthlyTrendChart({ companies, users }: { companies: MonthlyTrend[]; users: MonthlyTrend[] }) {
  const allMonths = Array.from(new Set([...companies, ...users].map((d) => d.month)));
  const merged = allMonths.map((m) => ({
    month: m,
    companies: companies.find((c) => c.month === m)?.count ?? 0,
    users: users.find((u) => u.month === m)?.count ?? 0,
  }));
  return (
    <Card title="Platform Growth" sub="Companies and users per month" icon={BarChart3}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={merged} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="gC" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gU" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={24} />
          <Tooltip content={<Tooltip_ />} />
          <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px", color: "#94a3b8" }} />
          <Area type="monotone" dataKey="companies" stroke="#f59e0b" strokeWidth={2.5} fill="url(#gC)" dot={false} />
          <Area type="monotone" dataKey="users" stroke="#6366f1" strokeWidth={2.5} fill="url(#gU)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}

function SARevenueTrendChart({ trend }: { trend: { month: string; revenue: number; subscriptions: number }[] }) {
  return (
    <Card title="Revenue Trend" sub="Monthly revenue and subscriptions" icon={DollarSign}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={trend} margin={{ top: 5, right: 5, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={40}
            tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
          <Tooltip content={<Tooltip_ />} />
          <Bar dataKey="revenue" name="Revenue ($)" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function BreakdownsSection({ breakdowns }: { breakdowns: BreakdownStats }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card title="By Industry" sub="Companies grouped" icon={Globe}>
        <div className="flex flex-col gap-2">
          {breakdowns.companiesByIndustry.map((i, idx) => {
            const color = CHART_COLORS[idx % CHART_COLORS.length];
            const total = breakdowns.companiesByIndustry.reduce((s, x) => s + x.count, 0);
            return (
              <div key={i.industry}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400 capitalize truncate">{i.industry}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{i.count}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-700/60">
                  <div className="h-1 rounded-full" style={{ width: `${(i.count / total) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Billing Cycles" sub="Active subscription cycles" icon={PieIcon}>
        <div className="flex flex-col gap-3">
          {breakdowns.subscriptionsByBillingCycle.map((c, i) => {
            const color = i === 0 ? "#6366f1" : "#10b981";
            const total = breakdowns.subscriptionsByBillingCycle.reduce((s, x) => s + x.count, 0);
            return (
              <div key={c.cycle}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-xs text-slate-400 capitalize">{c.cycle}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{fmtMoney(c.revenue)}</span>
                    <span className="text-xs font-mono font-bold text-slate-300">{c.count}</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-slate-700/60">
                  <div className="h-1.5 rounded-full" style={{ width: `${(c.count / total) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="By Country" sub="Geographic distribution" icon={Globe}>
        <div className="flex flex-col gap-2">
          {breakdowns.companiesByCountry.map((c, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            const total = breakdowns.companiesByCountry.reduce((s, x) => s + x.count, 0);
            return (
              <div key={c.country}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs text-slate-400 uppercase">{c.country}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{c.count}</span>
                </div>
                <div className="h-1 rounded-full bg-slate-700/60">
                  <div className="h-1 rounded-full" style={{ width: `${(c.count / total) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

// ── Role-Specific Layouts ──────────────────────────────────────────────────────

function SuperAdminLayout({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Companies" value={d.companies!.total} sub={`${d.companies!.active} active · ${d.companies!.thisMonth} this month`} icon={Building2} color="#f59e0b" />
        <StatCard label="Total Users" value={d.users!.total} sub={`${d.users!.active} active · ${d.users!.thisMonth} this month`} icon={Users} color="#6366f1" />
        <StatCard label="MRR" value={Math.round(d.revenue!.mrr)} prefix="$" sub={`ARR: ${fmtMoney(d.revenue!.arr)}`} icon={DollarSign} color="#10b981" />
        <StatCard label="Active Subs" value={d.subscriptions!.active} sub={`${d.subscriptions!.trial} trial · ${d.subscriptions!.canceled} canceled`} icon={Star} color="#8b5cf6" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SACompaniesCard companies={d.companies!} />
        <SARevenueCard subs={d.subscriptions!} revenue={d.revenue!} />
        <SAChurnCard churn={d.churn!} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <SAMonthlyTrendChart companies={d.trends!.monthlyCompanies} users={d.trends!.monthlyUsers} />
        <SARevenueTrendChart trend={d.revenue!.monthlyTrend} />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SAPlansCard plans={d.plans!} />
        <SALatestCompanies companies={d.latestCompanies!} />
        <SATopCompanies companies={d.topCompaniesByUsers!} />
      </div>

      {d.breakdowns && <BreakdownsSection breakdowns={d.breakdowns} />}

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2"><SAActivityCard activity={d.activity!} /></div>
        <SARecentActivities activities={d.recentActivities!} />
      </div>
    </>
  );
}

function CompanyAdminLayout({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Users" value={d.users!.total} sub={`${d.users!.active} active · +${d.users!.thisMonth} this month`} icon={Users} color="#6366f1" />
        {d.leads && <StatCard label="Total Leads" value={d.leads.total} sub={`${d.leads.won} won · ${d.leads.thisMonth} this month`} icon={Target} color="#10b981" />}
        {d.deals && <StatCard label="Revenue" value={Math.round(d.deals.totalRevenue)} prefix="$" sub={`${d.deals.closed} closed · avg ${fmtMoney(d.deals.avgDealValue)}`} icon={DollarSign} color="#f59e0b" />}
        {d.conversionRate && <StatCard label="Conversion" value={Math.round(d.conversionRate.conversionRate)} suffix="%" sub={`${d.conversionRate.won} won of ${d.conversionRate.total}`} icon={TrendingUp} color="#8b5cf6" />}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <UsersCard users={d.users!} />
        {d.leads && <LeadsCard leads={d.leads} />}
        {d.deals && <DealsCard deals={d.deals} />}
      </div>

      {d.monthlyLeadTrend && d.monthlyDealTrend && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2"><MonthlyTrendChart leads={d.monthlyLeadTrend} deals={d.monthlyDealTrend} /></div>
          {d.conversionRate && <ConversionCard conv={d.conversionRate} />}
        </div>
      )}

      {(d.dealPipelineBreakdown || d.topPerformers) && (
        <div className="grid grid-cols-3 gap-4">
          {d.dealPipelineBreakdown && <PipelineChart pipeline={d.dealPipelineBreakdown} />}
          {d.leadSourceBreakdown && (
            <Card title="Lead Sources" sub="Where leads come from" icon={PieIcon}>
              <div className="flex items-center gap-3">
                <ResponsiveContainer width={100} height={100}>
                  <PieChart>
                    <Pie data={d.leadSourceBreakdown.map((s) => ({ name: s.source, value: s.count }))}
                      cx="50%" cy="50%" innerRadius={28} outerRadius={46} dataKey="value" strokeWidth={0} paddingAngle={2}>
                      {d.leadSourceBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "10px", fontSize: "11px" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 flex flex-col gap-1">
                  {d.leadSourceBreakdown.slice(0, 6).map((s, i) => {
                    const color = CHART_COLORS[i % CHART_COLORS.length];
                    const total = d.leadSourceBreakdown!.reduce((sum, x) => sum + x.count, 0);
                    return (
                      <div key={s.source} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-xs text-slate-400 flex-1 truncate capitalize">{s.source}</span>
                        <span className="text-xs font-mono text-slate-300">{s.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          )}
          {d.topPerformers && <TopPerformers performers={d.topPerformers} />}
        </div>
      )}

      {(d.enquiries || d.tasks) && (
        <div className="grid grid-cols-3 gap-4">
          {d.enquiries && (
            <Card title="Enquiries" sub="Assignment status" icon={Activity}>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "Total", value: d.enquiries.total, color: "#6366f1" },
                  { label: "Active", value: d.enquiries.active, color: "#10b981" },
                  { label: "Assigned", value: d.enquiries.assigned, color: "#8b5cf6" },
                  { label: "Unassigned", value: d.enquiries.unassigned, color: "#f59e0b" },
                ].map((i) => (
                  <div key={i.label} className="rounded-xl p-2.5 bg-slate-700/30">
                    <p className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
                    <p className="text-[10px] text-slate-500">{i.label}</p>
                  </div>
                ))}
              </div>
              <MetricRow label="Assigned" value={d.enquiries.assigned} total={d.enquiries.total} color="#8b5cf6" />
            </Card>
          )}
          {d.tasks && <TaskCard tasks={d.tasks} />}
          {d.taskPriorityBreakdown && (
            <Card title="Task Priority" sub="Distribution by urgency" icon={Zap}>
              <div className="flex flex-col gap-3">
                {d.taskPriorityBreakdown.map((p) => {
                  const color = PRIORITY_COLORS[p.priority] ?? "#94a3b8";
                  const total = d.taskPriorityBreakdown!.reduce((s, x) => s + x.count, 0);
                  const pct = total > 0 ? (p.count / total) * 100 : 0;
                  return (
                    <div key={p.priority}>
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold capitalize px-2 py-0.5 rounded-full border"
                          style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                          {p.priority}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-300">{p.count}</span>
                          <span className="text-xs text-slate-600 w-9 text-right">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-700/60">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </>
  );
}

function ManagerUserLayout({ d }: { d: DashboardData }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        {d.leads && <StatCard label="Total Leads" value={d.leads.total} sub={`${d.leads.won} won · ${d.leads.active} active`} icon={Target} color="#10b981" />}
        {d.deals && <StatCard label="Revenue" value={Math.round(d.deals.totalRevenue)} prefix="$" sub={`${d.deals.closed} deals closed`} icon={DollarSign} color="#f59e0b" />}
        {d.tasks && <StatCard label="Tasks" value={d.tasks.total} sub={`${d.tasks.completed} done · ${d.tasks.overdue} overdue`} icon={CheckCircle2} color="#6366f1" />}
      </div>
      {d.leads && (
        <div className="grid grid-cols-2 gap-4">
          <LeadsCard leads={d.leads} />
          {d.conversionRate && <ConversionCard conv={d.conversionRate} />}
        </div>
      )}
      {d.deals && <DealsCard deals={d.deals} />}
      {d.tasks && <TaskCard tasks={d.tasks} />}
    </>
  );
}



// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function UnifiedDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DashboardFilter>("this_month");
  const auth = useSelector((state: RootState) => state.auth);

// In UnifiedDashboard.tsx — replace the load function

const load = useCallback(async (showRefresh = false) => {
  try {
    if (showRefresh) setRefreshing(true); else setLoading(true);
    setError(null);

    const res = await DashboardService.getDashboardStats({ filter });

    if (res.status === 200) {
      setData(res.data.data);
    } else {
      throw new Error(res.data.message);
    }
  } catch (err: any) {
    setError(err?.response?.data?.message ?? err?.message ?? "Failed to load dashboard");
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
}, [filter]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="mt-10 ml-72 min-h-screen dark:bg-slate-900 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Sk className="h-10 w-10" /><Sk className="h-8 w-48" /><Sk className="h-9 w-64 ml-auto" />
        </div>
        <div className="grid grid-cols-4 gap-4 mb-5">{Array.from({ length: 4 }).map((_, i) => <Sk key={i} className="h-32" />)}</div>
        <div className="grid grid-cols-3 gap-4 mb-5">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-64" />)}</div>
        <div className="grid grid-cols-2 gap-4 mb-5">{Array.from({ length: 2 }).map((_, i) => <Sk key={i} className="h-56" />)}</div>
        <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-48" />)}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-10 ml-72 min-h-screen dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={() => load()} className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-500 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const role = data.role as keyof typeof ROLE_CONFIG;
  const rc = ROLE_CONFIG[role] ?? ROLE_CONFIG.user;
  const RoleIcon = rc.icon;

  return (
    <div className="mt-10 ml-72 min-h-screen dark:bg-slate-900">
      <div className="p-6 flex flex-col gap-5">

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rc.gradient} flex items-center justify-center shadow-lg`}>
              <RoleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Dashboard</h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${rc.badge}`}>
                  <RoleIcon className="w-3 h-3" />{rc.label}
                </span>
                <span>·</span>
                <span>Generated {new Date(data.period.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <FilterBar current={filter} onChange={(f) => setFilter(f)} />
            <button onClick={() => load(true)} disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all disabled:opacity-50 flex items-center justify-center">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {data.enabledFeatures && data.enabledFeatures.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">Modules:</span>
            {data.enabledFeatures.map((f) => (
              <span key={f} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 capitalize">
                {f.replace(":feature", "")}
              </span>
            ))}
          </div>
        )}

        {role === "super_admin" && <SuperAdminLayout d={data} />}
        {role === "company_admin" && <CompanyAdminLayout d={data} />}
        {(role === "manager" || role === "user") && <ManagerUserLayout d={data} />}

      </div>
    </div>
  );
}