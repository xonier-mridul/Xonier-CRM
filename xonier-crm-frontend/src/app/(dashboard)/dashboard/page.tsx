"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { DashboardService } from "@/src/services/dashboard.service";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users, Target, DollarSign, TrendingUp, TrendingDown,
  Activity, Clock, Building2, Star, Award, Package,
  BarChart3, Layers, CheckCircle2, XCircle, Globe,
  PieChart as PieIcon, Zap, AlertCircle, RefreshCw,
  ArrowUpRight, ArrowDownRight, Shield, UserCheck,
  Briefcase, FileText, Phone, ChevronRight,
} from "lucide-react";
import { useTranslation } from "react-i18next";

// ── Types ──────────────────────────────────────────────────────────────────────

type DashboardFilter = "today" | "this_week" | "this_month" | "this_year";

interface MonthlyTrend { month: string; count: number; }
interface PipelineStage { pipeline: string; count: number; totalAmount: number; percentage: number; }
interface RecentActivity { entityType: string; action: string; title: string; description?: string | null; createdAt: string; entityId: string; }

interface LeadStats {
  total: number; inRange: number; active: number; won: number; lost?: number;
  inDeal: number; assigned?: number; unassigned?: number; thisMonth?: number;
}
interface DealStats {
  total: number; inRange: number; active: number; closed: number;
  totalRevenue: number; rangeRevenue: number; periodRevenue?: number;
  avgDealValue?: number; thisMonth?: number; inQuotation?: number;
}
interface QuotationStats { total: number; inRange: number; totalValue: number; rangeValue: number; }
interface EnquiryStats {
  total: number; inRange: number; active?: number; won?: number; lost?: number;
  assigned: number; unassigned?: number; bySource?: any[];
}
interface ActivityStats {
  total: number; inRange: number;
  byEntity: { count: number; entityType: string }[];
  byAction?: { count: number; action: string }[];
}
interface UserStats {
  total: number; active: number; inactive: number; suspended?: number;
  notVerified?: number; thisMonth?: number;
}
interface TaskStats {
  total: number; completed: number; overdue: number; unassigned: number;
  completionRate: number; thisMonth?: number;
}
interface ConversionRate { total: number; won: number; lost: number; conversionRate: number; }
interface CompanyStats {
  total: number; active: number; pending: number; suspended: number;
  deleted: number; thisMonth?: number;
}
interface SubscriptionStats {
  total: number; active: number; trial: number; canceled: number;
  totalRevenue: number; periodRevenue: number; avgRevenue: number;
}
interface RevenueStats {
  mrr: number; arr: number;
  monthlyTrend: { month: string; revenue: number; subscriptions: number }[];
}
interface ChurnStats { churnRate: number; revenueLost: number; canceledThisPeriod: number; newThisPeriod: number; }
interface PlanStat { planId: string; name: string; monthlyPrice: number; yearlyPrice: number; activeSubscriptions: number; status: string; }
interface LatestCompany { companyId: string; companyName: string; industry: string; country?: string; status: string; }
interface TopCompany { companyId: string; companyName: string; userCount: number; }
interface TopPerformer { userId: string; firstName: string; lastName: string; wonLeads: number; }
interface BreakdownStats {
  companiesByIndustry: { industry: string; count: number }[];
  companiesByCountry: { country: string; count: number }[];
  subscriptionsByBillingCycle: { cycle: string; count: number; revenue: number }[];
}

// Manager-specific
interface TeamsStats { totalTeams: number; activeTeams: number; totalMembers: number; }
interface MemberPerformance {
  userId: string; firstName: string; lastName: string;
  totalLeads: number; wonLeads: number; conversionRate: number;
  totalDeals: number; closedDeals: number; totalRevenue: number;
}

interface DashboardData {
  role: string;
  period: { filter: string; start: string; end: string; year: number; generatedAt: string; };
  user?: any;
  enabledFeatures?: string[];
  // Super admin
  companies?: CompanyStats;
  subscriptions?: SubscriptionStats;
  revenue?: RevenueStats;
  churn?: ChurnStats;
  plans?: PlanStat[];
  latestCompanies?: LatestCompany[];
  topCompaniesByUsers?: TopCompany[];
  breakdowns?: BreakdownStats;
  trends?: { monthlyCompanies: MonthlyTrend[]; monthlyUsers: MonthlyTrend[] };
  // Company admin
  users?: UserStats;
  conversionRate?: ConversionRate;
  topPerformers?: TopPerformer[];
  leadSourceBreakdown?: { source: string; count: number }[];
  leadStatusBreakdown?: { status: string; count: number }[];
  taskPriorityBreakdown?: { priority: string; count: number }[];
  tasks?: TaskStats;
  enquiries?: EnquiryStats;
  // Manager specific
  teams?: TeamsStats;
  memberPerformance?: MemberPerformance[];
  topPerformer?: MemberPerformance;
  // User specific
  quotations?: QuotationStats;
  activities?: ActivityStats;
  // Shared
  leads?: LeadStats;
  deals?: DealStats;
  monthlyLeadTrend?: MonthlyTrend[];
  monthlyDealTrend?: MonthlyTrend[];
  dealPipelineBreakdown?: PipelineStage[];
  recentActivities?: RecentActivity[];
  latestLeads?: any[];
  latestDeals?: any[];
  activity?: ActivityStats;
}

// ── Constants ──────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "this_week", label: "Week" },
  { value: "this_month", label: "Month" },
  { value: "this_year", label: "Year" },
];

const CHART_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899"];
const PIPELINE_COLORS: Record<string, string> = {
  qualification: "#6366f1", requirement_analysis: "#8b5cf6",
  proposal: "#06b6d4", negotiation: "#f59e0b", won: "#10b981", lost: "#ef4444",
};
const ACTION_COLORS: Record<string, string> = {
  login: "#10b981", logout: "#6366f1", create: "#f59e0b",
  update: "#06b6d4", delete: "#ef4444", view: "#8b5cf6",
};
const STATUS_COLORS: Record<string, string> = {
  active: "#10b981", pending: "#f59e0b", suspended: "#ef4444",
  inactive: "#94a3b8", deleted: "#6b7280",
};
const PRIORITY_COLORS: Record<string, string> = {
  critical: "#ef4444", high: "#f97316", medium: "#f59e0b", low: "#10b981",
};
const ROLE_CONFIG: Record<string, { label: string; icon: any; gradient: string; badge: string }> = {
  super_admin: { label: "Super Admin", icon: Shield, gradient: "from-red-500 to-rose-600", badge: "border-red-500/30 text-red-400 bg-red-500/10" },
  company_admin: { label: "Company Admin", icon: Building2, gradient: "from-amber-500 to-orange-600", badge: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  manager: { label: "Manager", icon: UserCheck, gradient: "from-indigo-500 to-violet-600", badge: "border-indigo-500/30 text-indigo-400 bg-indigo-500/10" },
  user: { label: "User", icon: Users, gradient: "from-emerald-500 to-teal-600", badge: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
};

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmt = (n: number) => n?.toLocaleString() ?? "0";
const fmtMoney = (n: number) => {
  if (!n) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
};
const cap = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ") : "";
const relTime = (iso: string) => {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (d < 60) return `${d}s ago`;
  if (d < 3600) return `${Math.floor(d / 60)}m ago`;
  if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
  return `${Math.floor(d / 86400)}d ago`;
};

// ── Hooks ──────────────────────────────────────────────────────────────────────

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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#9CA3AF" strokeWidth="8" />
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
          <span className="text-xs text-slate-500 w-9 text-right">{p.toFixed(1)}%</span>
        </div>
      </div>
      <div className="h-1 rounded-full bg-slate-200 dark:bg-slate-700/60">
        <div className="h-1 rounded-full transition-all duration-1000" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color, trend, prefix = "", suffix = "" }: {
  label: string; value: number; sub?: string; icon: any; color: string;
  trend?: { val: number; up: boolean }; prefix?: string; suffix?: string;
}) {
  const { t } = useTranslation();
  const v = useCountUp(value);
const gradientId = `gradient-${label.replace(/\s+/g, '-')}`;
const trendPaths = [
  "M0 42 C25 15, 55 55, 85 28 C115 8, 145 52, 175 30 C205 10, 235 40, 265 25 C285 18, 295 32, 300 28",

  "M0 35 C30 50, 60 10, 90 40 C120 60, 150 15, 180 35 C210 55, 240 20, 300 30",

  "M0 30 C40 5, 80 55, 120 20 C130 0, 200 50, 240 15 C270 5, 290 35, 300 25",

];

const trendPath =
  trendPaths[Math.floor(Math.random() * trendPaths.length)];

  return (
    <div
  className="
    relative overflow-hidden
    rounded-3xl
    border border-slate-200/80 hover:border-slate-200 dark:hover:border-slate-500 dark:border-slate-700/50
    bg-white dark:bg-slate-900
    p-6
    hover:-translate-y-1
    transition-all duration-300
    group cursor-default
    min-h-[150px]
  "
>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{ background: `radial-gradient(circle at top right, ${color}12, transparent 70%)` }} />
      <div className="absolute top-0 left-0 md:w-20 w-15 h-15 md:h-20  rounded-br-full opacity-5 group-hover:opacity-10 group-hover:w-25 group-hover:h-25 transition-opacity duration-500"
        style={{ backgroundColor: color }} />

      <div className="relative z-10 flex gap-6 mb-4">
        <div>
          <div className="md:w-12 md:h-12 h-9 w-9 rounded-xl flex items-center justify-center text-white flex-shrink-0"
           style={{ backgroundColor: color }}>
            <Icon className="md:w-6 md:h-6 h-4 w-4" />

          </div>

        </div>
        <div>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                   <p className="text-3xl md:text-4xl font-black tracking-tight text-slate-800 dark:text-white mb-1">
  {prefix}{v.toLocaleString()}{suffix}
</p>
            {sub && <p className="text-xs text-slate-500 mt-1 leading-relaxed">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-semibold ${trend.up ? "text-emerald-400" : "text-red-400"}`}>
            {trend.up ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {trend.val}{t("vs_last_period")}
          </div>

        )}
        </div>
      </div>
       <div className="absolute bottom-0 left-0 w-full h-14 pointer-events-none overflow-hidden">
  <svg
    viewBox="0 0 300 60"
    preserveAspectRatio="none"
    className="w-full h-full"
  >

<defs>
  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
    <stop offset="100%" stopColor={color} stopOpacity="0" />
  </linearGradient>
</defs>



    <path
      d={trendPath}
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
  d={`${trendPath} L300 60 L0 60 Z`}
  fill={`url(#${gradientId})`}
/>

    
  </svg>
</div>
     
    </div>
  );
}

function Card({ title, sub, icon: Icon, children, className = "" }: {
  title: string; sub?: string; icon?: any; children: React.ReactNode; className?: string;
}) {
  return (
    
    <div className={`dark:bg-slate-800/80 bg-white border h-full border-slate-200  rounded-2xl p-5   hover:border-slate-200 dark:hover:border-slate-500 dark:border-slate-700/50 hover:-translate-y-1 transition-all duration-200 ${className}`}>
     {(title || Icon) && (
    <div className="flex items-start justify-between mb-6 relative z-10">
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#16c2cf] to-[#0fb8a5] flex items-center justify-center">
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}

        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-white tracking-tight whitespace-nowrap">
            {title}
          </h3>

          {sub && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">
              {sub}
            </p>
          )}
        </div>
      </div>

      <button className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
        <span className="text-slate-500">↗</span>
      </button>
    </div>
  )}

      {children}
      </div>
    
  

  );
}

function EmptyState({ icon: Icon, message }: { icon: any; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-2">
      <Icon className="w-8 h-8 text-slate-600 opacity-40" />
      <p className="text-xs text-slate-600">{message}</p>
    </div>
  );
}

function FilterBar({ current, onChange }: { current: DashboardFilter; onChange: (f: DashboardFilter) => void }) {
  return (
    <div className="flex items-center gap-0.5 bg-slate-50 border-slate-200 dark:bg-slate-800/60 border dark:border-slate-700/50 rounded-xl p-1">
      {FILTER_OPTIONS.map((o) => (
        <button key={o.value} onClick={() => onChange(o.value as DashboardFilter)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${current === o.value ? "bg-cyan-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Shared Cards ───────────────────────────────────────────────────────────────

function LeadsCard({ leads }: { leads: LeadStats }) {
  const { t } = useTranslation();
  const wonPct = leads.total > 0 ? (leads.won / leads.total) * 100 : 0;
  return (
    <Card title={t("lead_pipeline")} sub={t("Status and conversion")} icon={Target}>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <Ring pct={wonPct} color="#10b981" size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-slate-500 text-xs font-bold dark:text-white">{wonPct.toFixed(0)}%</span>
            <span className="text-[9px] text-slate-400">{t("won_2")}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <MetricRow label={t("won")} value={leads.won} total={leads.total} color="#10b981" />
          <MetricRow label={t("active")} value={leads.active} total={leads.total} color="#6366f1" />
          {leads.lost !== undefined && <MetricRow label={t("lost")} value={leads.lost} total={leads.total} color="#ef4444" />}
          {leads.inDeal > 0 && <MetricRow label={t("in_deal")} value={leads.inDeal} total={leads.total} color="#f59e0b" />}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/40">
        {[
          {
  label: "Total",
  value: leads.total,
  color: "#6366f1",
  style: `
    bg-gradient-to-br
    from-indigo-50 to-indigo-100
    dark:from-indigo-950/40 dark:to-slate-900
    border border-indigo-200
    dark:border-indigo-800/50
    hover:border-indigo-400
    dark:hover:border-indigo-500
    hover:-translate-y-1
    transition-all duration-300
  `
},
          {
  label: "In Deal",
  value: leads.inDeal,
  color: "#8b5cf6",
  style: `
    bg-gradient-to-br
    from-violet-50 to-violet-100
    dark:from-violet-950/40 dark:to-slate-900
    border border-violet-200
    dark:border-violet-800/50
    hover:border-violet-400
    dark:hover:border-violet-500
    hover:-translate-y-1
    transition-all duration-300
  `
},{
  label: "This Period",
  value: leads.inRange,
  color: "#06b6d4",
  style: `
    bg-gradient-to-br
    from-cyan-50 to-cyan-100
    dark:from-cyan-950/40 dark:to-slate-900
    border border-cyan-200
    dark:border-cyan-800/50
    hover:border-cyan-400
    dark:hover:border-cyan-500

    hover:-translate-y-1
    transition-all duration-300
  `
},
        ].map((i) => (
          <div key={i.label} className={`text-center rounded-xl p-2 border ${i.style} dark:bg-slate-700/30`}>
            <p className="font-mono text-base font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function DealsCard({ deals }: { deals: DealStats }) {
  const { t } = useTranslation();
  const closedPct = deals.total > 0 ? (deals.closed / deals.total) * 100 : 0;
  const periodRevenue = deals.periodRevenue ?? deals.rangeRevenue ?? 0;
  return (
    <Card title={t("deal_revenue")} sub={t("Financial performance")} icon={DollarSign}>
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("total_revenue")}</p>
        <p className="font-mono text-4xl font-bold text-emerald-400">{fmtMoney(deals.totalRevenue ?? 0)}</p>
        <p className="text-xs text-slate-500 mt-1">{t("period")} <span className="text-emerald-400 font-semibold">{fmtMoney(periodRevenue)}</span></p>
      </div>
      <div className="grid grid-cols-4 rounded-xl py-2  border border-slate-200 mb-3 dark:border-slate-700">
        {[
          { label: "Active", value: deals.active, color: "#6366f1",border:"border-none" },
          { label: "Closed", value: deals.closed, color: "#10b981",border:"border-l border-slate-200" },
          { label: "Total", value: deals.total, color: "#8b5cf6",border:"border-l border-slate-200"  },
          { label: "This Period", value: deals.inRange, color: "#06b6d4",border:"border-l border-slate-200" },
        ].map((i) => (
          <div key={i.label} className={`flex flex-col justify-center ${i.border} items-center px-2.5  border-slate-200/40 dark:border-slate-700/40 hover:-translate-y-1`}>
            <p className="font-mono text-lg font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="pt-3 border-t border-slate-200/40 dark:border-slate-700/40">
        <div className="flex justify-between text-xs mb-1.5">
          <span className="text-slate-500">{t("close_rate")}</span>
          <span className="font-mono text-emerald-400">{closedPct.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-white dark:bg-slate-700/60">
          <div className="h-1.5 rounded-full bg-emerald-500" style={{ width: `${Math.min(closedPct, 100)}%` }} />
        </div>
      </div>
    </Card>
  );
}

function PipelineChart({ pipeline }: { pipeline: PipelineStage[] }) {
  const { t } = useTranslation();
  const hasData = pipeline.some((s) => s.count > 0);
  return (
    <Card title={t("deal_pipeline")} sub={t("Stage distribution")} icon={Layers}>
      <div className="flex flex-col gap-2.5 mb-4">
        {pipeline.map((s) => {
          const color = PIPELINE_COLORS[s.pipeline] ?? "#6366f1";
          return (
            <div key={s.pipeline} className="group">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="text-xs text-slate-400 capitalize group-hover:text-slate-300 transition-colors">{cap(s.pipeline)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">{fmtMoney(s.totalAmount)}</span>
                  <span className="text-xs font-mono font-bold text-slate-300">{s.count}</span>
                  <span className="text-xs text-slate-600 w-9 text-right">{s.percentage.toFixed(1)}%</span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-white dark:bg-slate-700/60">
                <div className="h-1.5 rounded-full" style={{ width: `${Math.min(s.percentage, 100)}%`, backgroundColor: color }} />
              </div>
            </div>
          );
        })}
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={100}>
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
      ) : (
        <div className="h-24 flex items-center justify-center">
          <p className="text-xs text-slate-600">{t("no_deal_data_yet")}</p>
        </div>
      )}
    </Card>
  );
}

function MonthlyTrendChart({ leads, deals }: { leads?: MonthlyTrend[]; deals?: MonthlyTrend[] }) {
  const { t } = useTranslation();
  const allMonths = Array.from(new Set([...(leads ?? []), ...(deals ?? [])].map((d) => d.month)));
  const merged = allMonths.map((month) => ({
    month,
    leads: leads?.find((l) => l.month === month)?.count ?? 0,
    deals: deals?.find((d) => d.month === month)?.count ?? 0,
  }));
  const hasData = merged.some((m) => m.leads > 0 || m.deals > 0);
  return (
    <Card title={t("monthly_growth")} sub="Leads vs deals per month" icon={BarChart3}>
      {hasData ? (
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
      ) : (
        <div className="h-48 flex items-center justify-center">
          <EmptyState icon={BarChart3} message="No trend data available yet" />
        </div>
      )}
    </Card>
  );
}

function RecentActivitiesCard({ activities }: { activities: RecentActivity[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t("recent_activities")} sub="Latest system events" icon={Clock}>
      {activities.length === 0 ? (
        <EmptyState icon={Activity} message="No recent activities" />
      ) : (
        <div className="flex flex-col gap-0">
          {activities.slice(0, 8).map((a, i) => {
            const color = ACTION_COLORS[a.action] ?? "#6366f1";
            return (
              <div key={i} className="flex gap-3 relative group">
                {i < Math.min(activities.length, 8) - 1 && (
                  <div className="absolute left-[9px] top-5 bottom-0 w-px bg-slate-300 dark:bg-slate-700/60" />
                )}
                <div className="w-4 h-4 mt-1 rounded-full border-2 flex items-center justify-center z-10 flex-shrink-0"
                  style={{ backgroundColor: `${color}25`, borderColor: color }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                </div>
                <div className="pb-3 flex-1 min-w-0">
                  <p className="text-xs text-slate-400 dark:text-slate-300 leading-relaxed font-medium">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ color, backgroundColor: `${color}15` }}>{cap(a.action)}</span>
                    <span className="text-[10px] text-slate-600 capitalize">{a.entityType}</span>
                    <span className="text-[10px] text-slate-600 ml-auto">{relTime(a.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Super Admin Cards ──────────────────────────────────────────────────────────

function SACompaniesCard({ companies }: { companies: CompanyStats }) {
  const { t } = useTranslation();
  return (
    <div className='col-span-2  h-full'>

    <Card title={t("companies")} sub="Platform company status" icon={Building2}>
      <div className="grid grid-cols-2 gap-2 mb-4 text-center justify-center mt-5">
        {[
          { label: "Total", value: companies.total, color: "#6366f1" ,border:'border border-indigo-200 hover:border-indigo-400'},
          { label: "Active", value: companies.active, color: "#10b981",border:'border border-green-200 hover:border-green-400' },
          { label: "Pending", value: companies.pending, color: "#f59e0b" ,border:'border border-orange-200 hover:border-orange-400'},
          { label: "Suspended", value: companies.suspended, color: "#ef4444",border:'border border-red-200 hover:border-red-400' },
        ].map((i) => (
          <div key={i.label} className={`rounded-xl p-3 ${i.border} dark:border-slate-700/40 dark:hover:border-slate-600 transition-colors`}
            style={{ background: `linear-gradient(135deg, ${i.color}12, ${i.color}05)` }}>
            <p className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2 mt-5">
        <MetricRow label={t("active")} value={companies.active} total={companies.total + companies.deleted} color="#10b981" />
        <MetricRow label={t("pending")} value={companies.pending} total={companies.total + companies.deleted} color="#f59e0b" />
        <MetricRow label={t("deleted")} value={companies.deleted} total={companies.total + companies.deleted} color="#6b7280" />
      </div>
    </Card>
    </div>

  );
}

function SARevenueCard({ subs, revenue }: { subs: SubscriptionStats; revenue: RevenueStats }) {
  const { t } = useTranslation();
  const data = [
  { name: "Enterprise", value: 45 },
  { name: "Pro", value: 30 },
  { name: "Starter", value: 15 },
  { name: "Free", value: 10 },
];

const COLORS = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];
  return (
    <div className='col-span-2'>
    <Card title={t("revenue")} sub="Subscription financials" icon={DollarSign}>
      <div className="mb-4 grid grid-cols-2   ">
           <div className="flex flex-col justify-center">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">MRR</p>
        <p className="font-mono text-4xl font-bold text-emerald-400">{fmtMoney(revenue.mrr)}</p>
        <p className="text-xs text-slate-500 mt-1">{t("arr")} <span className="text-emerald-400 font-semibold">{fmtMoney(revenue.arr)}</span></p>
        </div>
        <div>
          <div className="relative h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />

            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={50}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-slate-800 dark:text-white">
            {fmtMoney(subs.totalRevenue)}
          </span>
          <span className="text-[10px] text-slate-500">
            {t("total_revenue")}
          </span>
        </div>
      </div>


        </div>
     
      </div>
      <div className="grid grid-cols-4 justify-center border border-slate-200 mt-5 py-2.5 rounded-xl overflow-hidden  mb-4">
        {[
          { label: "Total Revenue", value: fmtMoney(subs.totalRevenue), color: "#10b981", border:'border-none' },
          { label: "Period Revenue", value: fmtMoney(subs.periodRevenue), color: "#6366f1", border:'border-l' },
          { label: "Active Subs", value: fmt(subs.active), color: "#8b5cf6", border:'border-l' },
          { label: "Avg Revenue", value: fmtMoney(subs.avgRevenue), color: "#f59e0b", border:'border-l' },
        ].map((i) => (
          <div key={i.label} className={`  bg-white dark:bg-slate-700/30 ${i.border} border-slate-200 hover:border-slate-300 dark:border-slate-700/40 flex flex-col justify-center items-center`}>
            <p className="font-mono text-base font-bold" style={{ color: i.color }}>{i.value}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 whitespace-nowrap ">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-300 dark:border-slate-700/40">
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{t("trial")}</span>
          <span className="font-mono font-bold text-amber-400">{subs.trial}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-500">{t("canceled")}</span>
          <span className="font-mono font-bold text-red-400">{subs.canceled}</span>
        </div>
      </div>
    </Card>
    </div>
  );
}

function SAPlansCard({ plans }: { plans: PlanStat[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t("plans")} sub="Subscription plan distribution" icon={Package}>
      <div className="flex flex-col gap-2">
        {plans.slice(0, 5).map((plan, i) => {
  const { t } = useTranslation();
          const color = CHART_COLORS[i % CHART_COLORS.length];
          return (
            <div key={plan.planId} className="flex items-center gap-3 p-2.5 rounded-xl dark:bg-slate-700/30 border border-slate-200 hover:border-slate-300 dark:border-slate-700/40 dark:hover:border-slate-600 transition-all group">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold dark:text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${color}, ${color}80)` }}>
                {(plan.name || "P")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 truncate">{plan.name}</p>
                <p className="text-[10px] text-slate-600">${plan.monthlyPrice}{t("mo")}{plan.yearlyPrice}/yr</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-mono font-bold" style={{ color }}>{plan.activeSubscriptions}</p>
                <p className="text-[10px] text-slate-600">{t("subs")}</p>
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
  const { t } = useTranslation();
  return (
    <Card title={t("churn_analysis")} sub="Subscription health" icon={TrendingDown}>
      <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
        {[
          { label: "Churn Rate", value: `${churn.churnRate.toFixed(1)}%`, color: "#6366f1", bg: "from-indigo-500/10 to-blue-500/5",border:'border border-indigo-200 hover:border-indigo-400' },
          { label: "Revenue Lost", value: fmtMoney(churn.revenueLost), color: "#ef4444", bg: "from-red-500/10 to-rose-500/5", border:'border border-red-200 hover:border-red-400'},
          { label: "Canceled", value: String(churn.canceledThisPeriod), color: "#f97316", bg: "from-orange-500/10 to-amber-500/5" ,border:'border border-orange-200 hover:border-orange-400'},
          { label: "New This Period", value: String(churn.newThisPeriod), color: "#10b981", bg: "from-emerald-500/10 to-green-500/5",border:'border border-green-200 hover:border-green-400' },
        ].map((i) => (
          <div
              key={i.label}
              className={`rounded-xl grid justify-center items-center  md:grid-cols-3 gap-2 md:gap-4 p-3 min-w-20 ${i.border} dark:border-slate-700/40 bg-gradient-to-br ${i.bg}`}
            >
              <div
                className="font-mono text-lg font-bold flex justify-center  whitespace-nowrap"
                style={{ color: i.color }}
              >
                {i.value}
              </div>

              <div className="md:col-span-2 min-w-0 text-[11px] text-slate-500 flex items-center">
                {i.label}
              </div>
            </div>
                    ))}
                  </div>
                </Card>
              );
            }

function SALatestCompanies({ companies }: { companies: LatestCompany[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t("latest_companies")} sub="5 most recently registered" icon={Building2}>
      <div className="flex flex-col gap-2">
        {companies.map((c, i) => {
          const color = STATUS_COLORS[c.status] ?? "#6b7280";
          return (
            <div key={c.companyId} className="flex items-center gap-3 p-2.5 rounded-xl dark:bg-slate-700/30 border dark:border-slate-700/40 border-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold dark:text-white flex-shrink-0"
                style={{ background: `linear-gradient(135deg, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[i % CHART_COLORS.length]}80)` }}>
                {(c.companyName || "C")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 truncate">{c.companyName}</p>
                <p className="text-[10px] text-slate-600 truncate">{c.industry} {c.country ? `· ${c.country}` : ""}</p>
              </div>
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full border flex-shrink-0"
                style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>{c.status}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SATopCompanies({ companies }: { companies: TopCompany[] }) {
  const { t } = useTranslation();
  const max = Math.max(...companies.map((c) => c.userCount), 1);
  return (
    <Card title={t("top_companies_by_users")} sub="Most active tenants" icon={Award}>
      <div className="flex flex-col gap-3">
        {companies.map((c, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          const medals = ["🥇", "🥈", "🥉", "4th", "5th"];
          return (
            <div key={c.companyId} className="group flex items-center gap-3 p-2 rounded-xl hover:bg-slate-700/30 transition-colors">
              <span className="text-sm w-6 text-center flex-shrink-0">{medals[i]}</span>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold dark:text-white flex-shrink-0" style={{ backgroundColor: color }}>
                {(c.companyName || "C")[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-300 truncate">{c.companyName}</p>
                <div className="mt-1 h-1 rounded-full bg-white dark:bg-slate-700/60">
                  <div className="h-1 rounded-full" style={{ width: `${(c.userCount / max) * 100}%`, backgroundColor: color }} />
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
  const { t } = useTranslation();
  return (
    <Card title={t("platform_activity")} sub="System-wide action breakdown" icon={Activity}>
      <div className="grid grid-cols-2 gap-4">
        {activity.byAction && (
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">{t("by_action")}</p>
            <div className="flex flex-col gap-2">
              {activity.byAction.map((a, i) => {
                const color = ACTION_COLORS[a.action] ?? CHART_COLORS[i % CHART_COLORS.length];
                const total = activity.byAction!.reduce((s, x) => s + x.count, 0);
                const p = total > 0 ? (a.count / total) * 100 : 0;
                return (
                  <div key={a.action}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400 capitalize">{a.action}</span>
                      <span className="text-xs font-mono font-bold text-slate-300">{a.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-white dark:bg-slate-700/60">
                      <div className="h-1 rounded-full" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-3">{t("by_entity")}</p>
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
                  <div className="h-1 rounded-full bg-white dark:bg-slate-700/60">
                    <div className="h-1 rounded-full" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-slate-300 dark:border-slate-700/40 flex items-center justify-between">
        <span className="text-xs text-slate-500">{t("total_actions")}</span>
        <span className="text-sm font-mono font-bold text-indigo-400">{activity.total.toLocaleString()}</span>
      </div>
    </Card>
  );
}

function SAMonthlyTrendChart({ companies, users }: { companies: MonthlyTrend[]; users: MonthlyTrend[] }) {
  const { t } = useTranslation();
  const allMonths = Array.from(new Set([...companies, ...users].map((d) => d.month)));
  const merged = allMonths.map((m) => ({
    month: m,
    companies: companies.find((c) => c.month === m)?.count ?? 0,
    users: users.find((u) => u.month === m)?.count ?? 0,
  }));
  return (
    <Card title={t("platform_growth")} sub="Companies and users per month" icon={BarChart3}>
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
  const { t } = useTranslation();
  return (
    <Card title={t("revenue_trend")} sub="Monthly revenue and subscriptions" icon={DollarSign}>
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
  const { t } = useTranslation();
  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title={t("by_industry")} sub="Companies grouped" icon={Globe}>
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
                <div className="h-1 rounded-full bg-white dark:bg-slate-700/60">
                  <div className="h-1 rounded-full" style={{ width: `${(i.count / total) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title={t("billing_cycles")} sub="Active subscription cycles" icon={PieIcon}>
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
                <div className="h-1.5 rounded-full bg-white dark:bg-slate-700/60">
                  <div className="h-1.5 rounded-full" style={{ width: `${(c.count / total) * 100}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title={t("by_country")} sub="Geographic distribution" icon={Globe}>
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
                <div className="h-1 rounded-full bg-white dark:bg-slate-700/60">
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

// ── Company Admin Cards ────────────────────────────────────────────────────────

function UsersCard({ users }: { users: UserStats }) {
  const { t } = useTranslation();
  return (
    <Card title={t("team_overview")} sub="User distribution" icon={Users}>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {[
          { label: "Total", value: users.total, color: "#6366f1" ,style: `
    bg-gradient-to-br
    from-indigo-50 to-indigo-100
    dark:from-indigo-950/40 dark:to-slate-900
    border border-indigo-200
    dark:border-indigo-800/50
    hover:border-indigo-400
    dark:hover:border-indigo-500
    hover:-translate-y-1
    transition-all duration-300
  ` },
          { label: "Active", value: users.active, color: "#10b981" ,style: `
    bg-gradient-to-br
    from-green-50 to-green-100
    dark:from-green-950/40 dark:to-slate-900
    border border-green-200
    dark:border-green-800/50
    hover:border-green-400
    dark:hover:border-green-500
    hover:-translate-y-1
    transition-all duration-300
  `},
          { label: "Inactive", value: users.inactive, color: "#f59e0b",style: `
    bg-gradient-to-br
    from-amber-50 to-amber-100
    dark:from-amber-950/40 dark:to-slate-900
    border border-amber-200
    dark:border-amber-800/50
    hover:border-amber-400
    dark:hover:border-amber-500
    hover:-translate-y-1
    transition-all duration-300
  ` },
          { label: "Not Verified", value: users.notVerified ?? 0, color: "#ef4444",style: `
    bg-gradient-to-br
    from-red-50 to-red-100
    dark:from-red-950/40 dark:to-slate-900
    border border-red-200
    dark:border-red-800/50
    hover:border-red-400
    dark:hover:border-red-500
    hover:-translate-y-1
    transition-all duration-300
  ` },
        ].map((i) => (
          <div key={i.label} className={`rounded-xl p-3 border flex flex-col justify-center ${i.style} items-center text-center`}
            style={{ background: `linear-gradient(135deg, ${i.color}12, ${i.color}05)` }}>
            <p className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <MetricRow label={t("active")} value={users.active} total={users.total} color="#10b981" />
        <MetricRow label={t("inactive")} value={users.inactive} total={users.total} color="#f59e0b" />
        <MetricRow label={t("suspended")} value={users.suspended ?? 0} total={users.total} color="#ef4444" />
      </div>
      <div className="mt-3 pt-3 border-t border-slate-700/40 flex justify-between text-xs">
        <span className="text-slate-500">{t("this_month_2")}</span>
        <span className="font-bold text-indigo-400">+{users.thisMonth ?? 0} {t("new")}</span>
      </div>
    </Card>
  );
}

function ConversionCard({ conv }: { conv: ConversionRate }) {
  const { t } = useTranslation();
  return (
    <Card title={t("conversion_funnel")} sub="Lead-to-won rate" icon={TrendingUp}>
      <div className="flex items-center justify-center mb-5">
        <div className="relative">
          <Ring pct={conv.conversionRate} color="#6366f1" size={110} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-slate-400 text-2xl font-bold dark:text-white">{conv.conversionRate.toFixed(1)}%</span>
            <span className="text-[10px] text-slate-500">{t("conversion_2")}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Total", value: conv.total, color: "#6366f1", icon: Target },
          { label: "Won", value: conv.won, color: "#10b981", icon: CheckCircle2 },
          { label: "Lost", value: conv.lost, color: "#ef4444", icon: XCircle },
        ].map((i) => (
          <div key={i.label} className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-slate-200/30 dark:bg-slate-700/30 border border-slate-200/40 dark:border-slate-700/40">
            <i.icon className="w-4 h-4" style={{ color: i.color }} />
            <span className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></span>
            <span className="text-[10px] text-slate-500">{i.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function TopPerformers({ performers }: { performers: TopPerformer[] }) {
  const { t } = useTranslation();
  const max = Math.max(...performers.map((p) => p.wonLeads), 1);
  const medals = ["🥇", "🥈", "🥉", "4th", "5th"];
  const colors = ["#f59e0b", "#94a3b8", "#cd7c4c", "#6366f1", "#8b5cf6"];
  return (
    <Card title={t("top_performers")} sub="Ranked by won leads" icon={Award}>
      {performers.length === 0 ? (
        <EmptyState icon={Award} message="No performance data yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {performers.slice(0, 5).map((p, i) => (
            <div key={p.userId} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-700/30 transition-colors group">
              <span className="text-sm w-6 text-center">{medals[i]}</span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold dark:text-white flex-shrink-0"
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
        </div>
      )}
    </Card>
  );
}

function TaskCard({ tasks }: { tasks: TaskStats }) {
  const { t } = useTranslation();
  return (
    <Card title={t("task_pulse")} sub="Completion metrics" icon={CheckCircle2}>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <Ring pct={tasks.completionRate} color="#10b981" size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-slate-500 text-xs font-bold dark:text-white">{tasks.completionRate.toFixed(0)}%</span>
          </div>
        </div>
        <div className="flex-1">
          <p className="text-xs text-slate-500 mb-1">{t("completion_rate_2")}</p>
          <p className="text-sm font-bold text-emerald-400">{tasks.completionRate.toFixed(1)}%</p>
          <p className="text-xs text-slate-600 mt-1">{tasks.completed} {t("of")} {tasks.total}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Overdue", value: tasks.overdue, color: "#ef4444" },
          { label: "Unassigned", value: tasks.unassigned, color: "#f59e0b" },
          { label: "This Month", value: tasks.thisMonth ?? 0, color: "#6366f1" },
        ].map((i) => (
          <div key={i.label} className="text-center rounded-xl p-2 bg-slate-200/30 dark:bg-slate-700/30">
            <p className="font-mono text-lg font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ── Manager-Specific Cards ─────────────────────────────────────────────────────

function TeamsCard({ teams }: { teams: TeamsStats }) {
  const { t } = useTranslation();
  return (
    <Card title={t("my_teams")} sub="Team overview" icon={Users}>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Teams", value: teams.totalTeams, color: "#6366f1" },
          { label: "Active Teams", value: teams.activeTeams, color: "#10b981" },
          { label: "Total Members", value: teams.totalMembers, color: "#f59e0b" },
        ].map((i) => (
          <div key={i.label} className="flex flex-col items-center justify-center rounded-2xl p-4 border border-slate-200/40 dark:border-slate-700/40"
            style={{ background: `linear-gradient(135deg, ${i.color}15, ${i.color}05)` }}>
            <p className="font-mono text-3xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
            <p className="text-[10px] text-slate-500 mt-1.5 text-center leading-tight">{i.label}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MemberPerformanceCard({ members }: { members: MemberPerformance[] }) {
  const { t } = useTranslation();
  const maxRevenue = Math.max(...members.map((m) => m.totalRevenue), 1);
  return (
    <Card title={t("member_performance")} sub="Team member metrics" icon={UserCheck} className="col-span-2">
      {members.length === 0 ? (
        <EmptyState icon={Users} message="No member performance data yet" />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700/40">
                <th className="text-left py-2 pr-4 text-slate-500 font-semibold">{t("member")}</th>
                <th className="text-right py-2 px-3 text-slate-500 font-semibold">{t("leads")}</th>
                <th className="text-right py-2 px-3 text-slate-500 font-semibold">{t("won")}</th>
                <th className="text-right py-2 px-3 text-slate-500 font-semibold">{t("conv")}</th>
                <th className="text-right py-2 px-3 text-slate-500 font-semibold">{t("deals")}</th>
                <th className="text-right py-2 px-3 text-slate-500 font-semibold">{t("closed")}</th>
                <th className="text-left py-2 pl-3 text-slate-500 font-semibold">{t("revenue")}</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                const revPct = (m.totalRevenue / maxRevenue) * 100;
                return (
                  <tr key={m.userId} className="border-b border-slate-100 dark:border-slate-700/20 hover:bg-slate-100 dark:hover:bg-slate-700/20 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: color }}>
                          {(m.firstName || "?")[0]}
                        </div>
                        <span className="font-medium text-slate-700 dark:text-slate-300 truncate max-w-[100px]">
                          {m.firstName} {m.lastName}
                        </span>
                      </div>
                    </td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-slate-400">{m.totalLeads}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-emerald-400">{m.wonLeads}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-indigo-400">{m.conversionRate.toFixed(1)}%</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-slate-400">{m.totalDeals}</td>
                    <td className="text-right py-2.5 px-3 font-mono font-bold text-amber-400">{m.closedDeals}</td>
                    <td className="py-2.5 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60 w-16">
                          <div className="h-1.5 rounded-full" style={{ width: `${revPct}%`, backgroundColor: color }} />
                        </div>
                        <span className="font-mono font-bold text-slate-300 flex-shrink-0">{fmtMoney(m.totalRevenue)}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function TopPerformerCard({ performer }: { performer: MemberPerformance }) {
  const { t } = useTranslation();
  return (
    <Card title={t("top_performer_2")} sub="Best team member this period" icon={Award}>
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white mb-3"
          style={{ background: "linear-gradient(135deg, #f59e0b, #f97316)" }}>
          {(performer.firstName || "?")[0]}
        </div>
        <p className="text-sm font-bold text-slate-700 dark:text-white">{performer.firstName} {performer.lastName}</p>
        <p className="text-[10px] text-slate-500 mb-4">{t("top_performer")}</p>
        <div className="grid grid-cols-2 gap-2 w-full">
          {[
            { label: "Won Leads", value: performer.wonLeads, color: "#10b981" },
            { label: "Conversion", value: `${performer.conversionRate.toFixed(1)}%`, color: "#6366f1" },
            { label: "Closed Deals", value: performer.closedDeals, color: "#f59e0b" },
            { label: "Revenue", value: fmtMoney(performer.totalRevenue), color: "#8b5cf6" },
          ].map((i) => (
            <div key={i.label} className="rounded-xl p-2.5 border border-slate-200/40 dark:border-slate-700/40"
              style={{ background: `linear-gradient(135deg, ${i.color}12, ${i.color}05)` }}>
              <p className="font-mono text-base font-bold" style={{ color: i.color }}>{typeof i.value === "number" ? <AnimNum value={i.value} /> : i.value}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">{i.label}</p>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

function EnquiriesCard({ enquiries }: { enquiries: EnquiryStats }) {
  const { t } = useTranslation();
  const assignedPct = enquiries.total > 0 ? (enquiries.assigned / enquiries.total) * 100 : 0;
  return (
    <Card title={t("enquiries")} sub="Assignment overview" icon={Phone}>
      <div className="flex items-center gap-4 mb-4">
        <div className="relative flex-shrink-0">
          <Ring pct={assignedPct} color="#8b5cf6" size={72} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-xs text-slate-500 font-bold dark:text-white">{assignedPct.toFixed(0)}%</span>
            <span className="text-[9px] text-slate-400">{t("assigned_2")}</span>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-1.5">
          <MetricRow label={t("assigned")} value={enquiries.assigned} total={enquiries.total} color="#8b5cf6" />
          {enquiries.unassigned !== undefined && (
            <MetricRow label={t("unassigned")} value={enquiries.unassigned} total={enquiries.total} color="#f59e0b" />
          )}
          {enquiries.active !== undefined && (
            <MetricRow label={t("active")} value={enquiries.active} total={enquiries.total} color="#10b981" />
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/40">
        <div className=" bg-gradient-to-br
    from-indigo-50 to-indigo-100
    dark:from-indigo-950/40 dark:to-slate-900
    border border-indigo-200
    dark:border-indigo-800/50
    hover:border-indigo-400
    dark:hover:border-indigo-500
    hover:-translate-y-1
    transition-all duration-300 flex flex-col justify-center items-center  py-2 rounded-xl">
          <p className="font-mono text-base font-bold text-indigo-400"><AnimNum value={enquiries.total} /></p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t("total_2")}</p>
        </div>
        <div className="bg-gradient-to-br
    from-cyan-50 to-cyan-100
    dark:from-cyan-950/40 dark:to-slate-900
    border border-cyan-200
    dark:border-cyan-800/50
    hover:border-cyan-400
    dark:hover:border-cyan-500

    hover:-translate-y-1
    transition-all duration-300 flex flex-col justify-center items-center  py-2 rounded-xl">
          <p className="font-mono text-base font-bold text-cyan-400"><AnimNum value={enquiries.inRange} /></p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t("this_period")}</p>
        </div>
      </div>
    </Card>
  );
}

// ── User-Specific Cards ────────────────────────────────────────────────────────

function QuotationsCard({ quotations }: { quotations: QuotationStats }) {
  const { t } = useTranslation();
  return (
    <Card title={t("quotations")} sub="Value overview" icon={FileText}>
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("total_value")}</p>
        <p className="font-mono text-3xl font-bold text-indigo-400">{fmtMoney(quotations.totalValue)}</p>
        <p className="text-xs text-slate-500 mt-1">{t("period")} <span className="text-indigo-400 font-semibold">{fmtMoney(quotations.rangeValue)}</span></p>
      </div>
      <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/40">
        <div className="  bg-gradient-to-br
    from-indigo-50 to-indigo-100
    dark:from-indigo-950/40 dark:to-slate-900
    border border-indigo-200
    dark:border-indigo-800/50
    hover:border-indigo-400
    dark:hover:border-indigo-500
    hover:-translate-y-1
    transition-all duration-300 flex flex-col justify-center items-center  py-2 rounded-xl">
          <p className="font-mono text-xl font-bold text-indigo-400"><AnimNum value={quotations.total} /></p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t("total_2")}</p>
        </div>
        <div className="bg-gradient-to-br
    from-cyan-50 to-cyan-100
    dark:from-cyan-950/40 dark:to-slate-900
    border border-cyan-200
    dark:border-cyan-800/50
    hover:border-cyan-400
    dark:hover:border-cyan-500

    hover:-translate-y-1
    transition-all duration-300 flex flex-col justify-center items-center  py-2 rounded-xl">
          <p className="font-mono text-xl font-bold text-cyan-400"><AnimNum value={quotations.inRange} /></p>
          <p className="text-[10px] text-slate-500 mt-0.5">{t("this_period")}</p>
        </div>
      </div>
    </Card>
  );
}

function UserActivitiesCard({ activities }: { activities: ActivityStats }) {
  const { t } = useTranslation();
  const total = activities.byEntity.reduce((s, e) => s + e.count, 0);
  return (
    <Card title={t("my_activity")} sub="Action breakdown by entity" icon={Activity}>
      <div className="mb-4">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("total_actions_2")}</p>
        <p className="font-mono text-3xl font-bold text-emerald-400"><AnimNum value={activities.total} /></p>
        <p className="text-xs text-slate-500 mt-1">{t("this_period_2")} <span className="text-emerald-400 font-semibold">{activities.inRange}</span></p>
      </div>
      <div className="flex flex-col gap-2 pt-3 border-t border-slate-200 dark:border-slate-700/40">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">{t("by_entity")}</p>
        {activities.byEntity.length === 0 ? (
          <p className="text-xs text-slate-600 py-2">{t("no_activity_recorded")}</p>
        ) : (
          activities.byEntity.map((e, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            const p = total > 0 ? (e.count / total) * 100 : 0;
            return (
              <div key={e.entityType}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400 capitalize">{e.entityType}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-300">{e.count}</span>
                    <span className="text-[10px] text-slate-600 w-10 text-right">{p.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-white dark:bg-slate-700/60">
                  <div className="h-1.5 rounded-full" style={{ width: `${Math.min(p, 100)}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}

function LatestLeadsCard({ leads }: { leads: any[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t("latest_leads")} sub="Most recent leads assigned to you" icon={Target}>
      {leads.length === 0 ? (
        <EmptyState icon={Target} message="No leads assigned yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {leads.slice(0, 5).map((lead, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={lead.id ?? i} className="flex items-center gap-3 p-2.5 rounded-xl dark:bg-slate-700/30 border dark:border-slate-700/40 border-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: color }}>
                  {(lead.name || lead.title || "L")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{lead.name ?? lead.title ?? "Lead"}</p>
                  <p className="text-[10px] text-slate-500 truncate">{lead.status ?? "—"}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function LatestDealsCard({ deals }: { deals: any[] }) {
  const { t } = useTranslation();
  return (
    <Card title={t("latest_deals")} sub="Most recent deals assigned to you" icon={Briefcase}>
      {deals.length === 0 ? (
        <EmptyState icon={Briefcase} message="No deals assigned yet" />
      ) : (
        <div className="flex flex-col gap-2">
          {deals.slice(0, 5).map((deal, i) => {
            const color = CHART_COLORS[i % CHART_COLORS.length];
            return (
              <div key={deal.id ?? i} className="flex items-center gap-3 p-2.5 rounded-xl dark:bg-slate-700/30 border dark:border-slate-700/40 border-slate-200 hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: color }}>
                  {(deal.name || deal.title || "D")[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{deal.name ?? deal.title ?? "Deal"}</p>
                  <p className="text-[10px] text-emerald-400 font-mono">{deal.amount ? fmtMoney(deal.amount) : "—"}</p>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Role Layouts ───────────────────────────────────────────────────────────────

function SuperAdminLayout({ d }: { d: DashboardData }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4  gap-4">
        <StatCard label={t("companies")} value={d.companies!.total} sub={`${d.companies!.active} active · ${d.companies!.thisMonth ?? 0} this month`} icon={Building2} color="#f59e0b" />
        <StatCard label={t("total_users")} value={d.users!.total} sub={`${d.users!.active} active · ${d.users!.thisMonth ?? 0} this month`} icon={Users} color="#6366f1" />
        <StatCard label="MRR" value={Math.round(d.revenue!.mrr)} prefix="$" sub={`ARR: ${fmtMoney(d.revenue!.arr)}`} icon={DollarSign} color="#10b981" />
        <StatCard label={t("active_subs")} value={d.subscriptions!.active} sub={`${d.subscriptions!.trial} trial · ${d.subscriptions!.canceled} canceled`} icon={Star} color="#8b5cf6" />
      </div>


      <div className="grid  md:grid-cols-5 gap-4">
        <SACompaniesCard companies={d.companies!} />
        <SARevenueCard subs={d.subscriptions!} revenue={d.revenue!} />
        <SAChurnCard churn={d.churn!} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <SAMonthlyTrendChart companies={d.trends!.monthlyCompanies} users={d.trends!.monthlyUsers} />
        <SARevenueTrendChart trend={d.revenue!.monthlyTrend} />
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        <SAPlansCard plans={d.plans!} />
        <SALatestCompanies companies={d.latestCompanies!} />
        <SATopCompanies companies={d.topCompaniesByUsers!} />
      </div>
      {d.breakdowns && <BreakdownsSection breakdowns={d.breakdowns} />}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="col-span-2"><SAActivityCard activity={d.activity!} /></div>
        <RecentActivitiesCard activities={d.recentActivities ?? []} />
      </div>
    </>
  );
}

function CompanyAdminLayout({ d }: { d: DashboardData }) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid grid-cols-4 gap-4">
        <StatCard label={t("total_users")} value={d.users!.total} sub={`${d.users!.active} active · +${d.users!.thisMonth ?? 0} this month`} icon={Users} color="#6366f1" />
        {d.leads && <StatCard label={t("total_leads")} value={d.leads.total} sub={`${d.leads.won} won · ${d.leads.inRange} this period`} icon={Target} color="#10b981" />}
        {d.deals && <StatCard label={t("revenue")} value={Math.round(d.deals.totalRevenue)} prefix="$" sub={`${d.deals.closed} closed`} icon={DollarSign} color="#f59e0b" />}
        {d.conversionRate && <StatCard label={t("conversion")} value={Math.round(d.conversionRate.conversionRate)} suffix="%" sub={`${d.conversionRate.won} won of ${d.conversionRate.total}`} icon={TrendingUp} color="#8b5cf6" />}
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
      {d.dealPipelineBreakdown && (
        <div className="grid grid-cols-3 gap-4">
          <PipelineChart pipeline={d.dealPipelineBreakdown} />
          {d.leadSourceBreakdown && (
            <Card title={t("lead_sources")} sub="Where leads come from" icon={PieIcon}>
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
            <Card title={t("enquiries")} sub="Assignment status" icon={Activity}>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {[
                  { label: "Total", value: d.enquiries.total, color: "#6366f1" },
                  { label: "Active", value: d.enquiries.active ?? 0, color: "#10b981" },
                  { label: "Assigned", value: d.enquiries.assigned, color: "#8b5cf6" },
                  { label: "Unassigned", value: d.enquiries.unassigned ?? 0, color: "#f59e0b" },
                ].map((i) => (
                  <div key={i.label} className="rounded-xl p-2.5 bg-slate-200/30 dark:bg-slate-700/30">
                    <p className="font-mono text-xl font-bold" style={{ color: i.color }}><AnimNum value={i.value} /></p>
                    <p className="text-[10px] text-slate-500">{i.label}</p>
                  </div>
                ))}
              </div>
              <MetricRow label={t("assigned")} value={d.enquiries.assigned} total={d.enquiries.total} color="#8b5cf6" />
            </Card>
          )}
          {d.tasks && <TaskCard tasks={d.tasks} />}
          {d.taskPriorityBreakdown && (
            <Card title={t("task_priority")} sub="Distribution by urgency" icon={Zap}>
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
                      <div className="h-1.5 rounded-full bg-slate-200/50 dark:bg-slate-700/60">
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

function ManagerLayout({ d }: { d: DashboardData }) {
  const { t } = useTranslation();
  return (
    <>
      {/* Stat row */}
      <div className="grid grid-cols-4 gap-4">
        {d.teams && (
          <StatCard label={t("team_members")} value={d.teams.totalMembers}
            sub={`${d.teams.activeTeams} active team${d.teams.activeTeams !== 1 ? "s" : ""}`}
            icon={Users} color="#6366f1" />
        )}
        {d.leads && (
          <StatCard label={t("total_leads")} value={d.leads.total}
            sub={`${d.leads.won} won · ${d.leads.active} active`}
            icon={Target} color="#10b981" />
        )}
        {d.deals && (
          <StatCard label={t("revenue")} value={Math.round(d.deals.totalRevenue)}
            prefix="$" sub={`${d.deals.closed} deals closed`}
            icon={DollarSign} color="#f59e0b" />
        )}
        {d.enquiries && (
          <StatCard label={t("enquiries")} value={d.enquiries.total}
            sub={`${d.enquiries.assigned} assigned · ${d.enquiries.inRange} this period`}
            icon={Phone} color="#8b5cf6" />
        )}
      </div>

      {/* Teams + Leads + Deals */}
      <div className="grid grid-cols-3 gap-4">
        {d.teams && <TeamsCard teams={d.teams} />}
        {d.leads && <LeadsCard leads={d.leads} />}
        {d.deals && <DealsCard deals={d.deals} />}
      </div>

      {/* Monthly trend + Enquiries */}
      {(d.monthlyLeadTrend || d.monthlyDealTrend) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <MonthlyTrendChart leads={d.monthlyLeadTrend} deals={d.monthlyDealTrend} />
          </div>
          {d.enquiries && <EnquiriesCard enquiries={d.enquiries} />}
        </div>
      )}

      {/* Pipeline + Top Performer */}
      <div className="grid grid-cols-3 gap-4">
        {d.dealPipelineBreakdown && <PipelineChart pipeline={d.dealPipelineBreakdown} />}
        {d.memberPerformance && d.memberPerformance.length > 0 && (
          <MemberPerformanceCard members={d.memberPerformance} />
        )}
      </div>

      {/* Top performer highlight + Lead source */}
      <div className="grid grid-cols-3 gap-4">
        {d.topPerformer && <TopPerformerCard performer={d.topPerformer} />}
        {d.leadSourceBreakdown && d.leadSourceBreakdown.length > 0 && (
          <Card title={t("lead_sources")} sub="Where leads originate" icon={PieIcon}>
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
                {d.leadSourceBreakdown.slice(0, 6).map((s, i) => (
                  <div key={s.source} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                    <span className="text-xs text-slate-400 flex-1 truncate capitalize">{s.source}</span>
                    <span className="text-xs font-mono text-slate-300">{s.count}</span>
                  </div>
                ))}
                {d.leadSourceBreakdown.length === 0 && (
                  <p className="text-xs text-slate-600">{t("no_source_data")}</p>
                )}
              </div>
            </div>
          </Card>
        )}
        {d.leadStatusBreakdown && d.leadStatusBreakdown.length > 0 && (
          <Card title={t("lead_status")} sub="Status distribution" icon={Layers}>
            <div className="flex flex-col gap-2.5">
              {d.leadStatusBreakdown.map((s, i) => {
                const color = CHART_COLORS[i % CHART_COLORS.length];
                const total = d.leadStatusBreakdown!.reduce((sum, x) => sum + x.count, 0);
                const pct = total > 0 ? (s.count / total) * 100 : 0;
                return (
                  <div key={s.status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400 capitalize">{cap(s.status)}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-300">{s.count}</span>
                        <span className="text-[10px] text-slate-600 w-9 text-right">{pct.toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-white dark:bg-slate-700/60">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </>
  );
}

function UserLayout({ d }: { d: DashboardData }) {
  const { t } = useTranslation();
  return (
    <>
      {/* Stat row */}
      <div className="grid grid-cols-4 gap-4">
        {d.leads && (
          <StatCard label={t("my_leads")} value={d.leads.total}
            sub={`${d.leads.won} won · ${d.leads.active} active`}
            icon={Target} color="#10b981" />
        )}
        {d.deals && (
          <StatCard label={t("my_deals")} value={d.deals.total}
            sub={`${d.deals.closed} closed · ${fmtMoney(d.deals.totalRevenue)} revenue`}
            icon={Briefcase} color="#6366f1" />
        )}
        {d.quotations && (
          <StatCard label={t("quotations")} value={d.quotations.total}
            sub={`Value: ${fmtMoney(d.quotations.totalValue)}`}
            icon={FileText} color="#f59e0b" />
        )}
        {d.activities && (
          <StatCard label={t("activities")} value={d.activities.total}
            sub={`${d.activities.inRange} this period`}
            icon={Activity} color="#8b5cf6" />
        )}
      </div>

      {/* Leads + Deals + Quotations */}
      <div className="grid grid-cols-3 gap-4">
        {d.leads && <LeadsCard leads={d.leads} />}
        {d.deals && <DealsCard deals={d.deals} />}
        {d.quotations
          ? <QuotationsCard quotations={d.quotations} />
          : d.activities && <UserActivitiesCard activities={d.activities} />
        }
      </div>

      {/* Monthly trend + Enquiries */}
      {(d.monthlyLeadTrend || d.monthlyDealTrend) && (
        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-2">
            <MonthlyTrendChart leads={d.monthlyLeadTrend} deals={d.monthlyDealTrend} />
          </div>
          {d.enquiries && <EnquiriesCard enquiries={d.enquiries} />}
        </div>
      )}

      {/* Pipeline + Activities (if quotations already shown) */}
      <div className="grid grid-cols-3 gap-4">
        {d.dealPipelineBreakdown && <PipelineChart pipeline={d.dealPipelineBreakdown} />}
        {d.quotations && d.activities && (
          <UserActivitiesCard activities={d.activities} />
        )}
        {d.recentActivities && d.recentActivities.length > 0 && (
          <RecentActivitiesCard activities={d.recentActivities} />
        )}
      </div>

      {/* Latest Leads + Latest Deals */}
      {((d.latestLeads && d.latestLeads.length > 0) || (d.latestDeals && d.latestDeals.length > 0)) && (
        <div className="grid grid-cols-2 gap-4">
          {d.latestLeads && <LatestLeadsCard leads={d.latestLeads} />}
          {d.latestDeals && <LatestDealsCard deals={d.latestDeals} />}
        </div>
      )}

      {/* Recent activities full row if no latest leads/deals */}
      {d.recentActivities && d.recentActivities.length > 0 &&
        (!d.latestLeads || d.latestLeads.length === 0) &&
        (!d.latestDeals || d.latestDeals.length === 0) && (
          <RecentActivitiesCard activities={d.recentActivities} />
        )
      }
    </>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────

export default function UnifiedDashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<DashboardFilter>("this_month");
  const auth = useSelector((state: RootState) => state.auth);

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
      <div className="mt-10 lg:ml-72 min-h-screen dark:bg-slate-900 p-6">
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
      <div className="mt-10 md:ml-72 min-h-screen dark:bg-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-sm text-slate-400">{error}</p>
          <button onClick={() => load()} className="px-5 py-2 rounded-xl bg-indigo-600 dark:text-white text-sm font-semibold hover:bg-indigo-500 transition-colors">
            {t("retry")}
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
    <div className=" relative  mt-10 lg:ml-72 min-h-screen">
     
      <div className="p-6 flex flex-col gap-5">

        {/* Header */}
        <div className="flex flex-col  lg:flex-row items-center justify-center">
          <div className="flex w-full items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${rc.gradient} flex items-center justify-center shadow-lg`}>
              <RoleIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold dark:text-white tracking-tight">{t("dashboard")}</h1>
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-widest ${rc.badge}`}>
                  <RoleIcon className="w-3 h-3" />{rc.label}
                </span>
                <span>·</span>
                <span>{t("generated")} {new Date(data.period.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full justify-end">
            <FilterBar current={filter} onChange={(f) => setFilter(f)} />
            <button onClick={() => load(true)} disabled={refreshing}
              className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/50 transition-all disabled:opacity-50 flex items-center justify-center">
              <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Enabled features badge */}
        {data.enabledFeatures && data.enabledFeatures.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-600 uppercase tracking-widest">{t("modules")}</span>
            {data.enabledFeatures.map((f) => (
              <span key={f} className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-400 capitalize">
                {f.replace(":feature", "")}
              </span>
            ))}
          </div>
        )}

        {/* Role layouts */}
        {role === "super_admin" && <SuperAdminLayout d={data} />}
        {role === "company_admin" && <CompanyAdminLayout d={data} />}
        {role === "manager" && <ManagerLayout d={data} />}
        {role === "user" && <UserLayout d={data} />}

      </div>
    </div>
  );
}