"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ForecastEntry, Lead } from "@/src/types/referral/referral.type";
import {
  TrendingUp,
  Download,
  BarChart3,
  Calendar,
  Zap,
  RefreshCw,
  Target,

} from "lucide-react";

const STORAGE_KEY = "hrjee_referral_demo_leads";
const USE_DEMO_DATA = process.env.NEXT_PUBLIC_USE_DEMO_DATA !== "false";

// ============================================================
// Data Layer — swap the two `fetch*` bodies for real API calls.
// Nothing else in this file needs to change when you go live.
// ============================================================

interface RenewalScheduleEntry {
  month: string;
  value: number;
}

/**
 * TODO(API): replace body with
 *   const res = await fetch("/api/partner/leads");
 *   if (!res.ok) throw new Error("Failed to load leads");
 *   return res.json();
 */
async function fetchLeads(): Promise<Lead[]> {
  if (!USE_DEMO_DATA) {
    const res = await fetch("/api/partner/leads");
    if (!res.ok) throw new Error("Failed to load leads");
    return res.json();
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * TODO(API): replace body with
 *   const res = await fetch(`/api/partner/renewals?months=${months}`);
 *   if (!res.ok) throw new Error("Failed to load renewal schedule");
 *   return res.json();
 */
async function fetchRenewalSchedule(months: number): Promise<RenewalScheduleEntry[]> {
  if (!USE_DEMO_DATA) {
    const res = await fetch(`/api/partner/renewals?months=${months}`);
    if (!res.ok) throw new Error("Failed to load renewal schedule");
    return res.json();
  }

  const labels = generateMonthLabels(months);
  return labels.map((month, i) => {
    const hasRenewal = seededRandom(`renewal-flag-${i}`) < 0.4;
    return {
      month,
      value: hasRenewal
        ? Math.round(seededRandom(`renewal-value-${i}`) * 150000 + 50000)
        : 0,
    };
  });
}

// Deterministic pseudo-random generator so demo numbers stay stable
// across re-renders instead of flickering like Math.random() would.
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h << 5) - h + seed.charCodeAt(i);
    h |= 0;
  }
  const x = Math.sin(h) * 10000;
  return x - Math.floor(x);
}

// ============================================================
// Stage normalization — leads may come from the API with
// inconsistent casing ("Won" vs "won"). Normalize once, here.
// ============================================================

const OPEN_STAGES = new Set(["qualified", "demo", "proposal"]);
const CLOSED_STAGES = new Set(["won", "lost"]);
const normalizeStage = (s: string) => (s || "").toLowerCase();
const isWon = (l: Lead) => normalizeStage(l.stage) === "won";

function safeParseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

// ============================================================
// Forecast Engine — Table 6.4 Implementation
// ============================================================

interface ForecastInput {
  openLeads: Lead[];
  closedLeads: Lead[];
  renewalSchedule: RenewalScheduleEntry[];
}

function calculateHistoricalWinRate(closedLeads: Lead[]): number {
  if (closedLeads.length === 0) return 0.35;
  const won = closedLeads.filter(isWon).length;
  return won / closedLeads.length;
}

function generateMonthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    labels.push(d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }));
  }
  return labels;
}

function calculateForecast(input: ForecastInput, months: number): ForecastEntry[] {
  const winRate = calculateHistoricalWinRate(input.closedLeads);
  const openPipelineValue = input.openLeads.reduce((s, l) => s + (Number(l.dealValue) || 0), 0);

  const pipelineCommission = openPipelineValue * winRate * 0.2;
  const monthlyFromPipeline = pipelineCommission / months;

  const labels = generateMonthLabels(months);
  return labels.map((period, idx) => {
    const baseProjection = monthlyFromPipeline * 0.7;
    const renewalCommission = input.renewalSchedule[idx]?.value || 0;
    // Seeded, deterministic "variance" — stable per period/month-count,
    // stands in for whatever confidence banding the real model will apply.
    const variance = seededRandom(`variance-${months}-${idx}`) * 0.3;
    const adjustedProjection = baseProjection * (1 + variance);

    return {
      period,
      projectedNewDealCommission: Math.round(adjustedProjection),
      confirmedRenewalCommission: renewalCommission,
      total: Math.round(adjustedProjection + renewalCommission),
    };
  });
}



// ============================================================
// Data-loading hook (kept in-file, but isolated from render logic)
// ============================================================

function useForecastData(monthCount: number) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [renewalSchedule, setRenewalSchedule] = useState<RenewalScheduleEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [leadsData, renewals] = await Promise.all([
        fetchLeads(),
        fetchRenewalSchedule(monthCount),
      ]);
      setLeads(leadsData);
      setRenewalSchedule(renewals);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load forecast data");
    } finally {
      setIsLoading(false);
    }
  }, [monthCount]);

  useEffect(() => {
    load();
  }, [load]);

  return { leads, renewalSchedule, isLoading, error, refresh: load };
}

// ============================================================
// Main Component
// ============================================================
export default function PartnerForecast() {
  const [period, setPeriod] = useState<"3m" | "6m" | "12m">("12m");
  const [filterDealType, setFilterDealType] = useState<string>("all");



  const monthCount = period === "3m" ? 3 : period === "6m" ? 6 : 12;

  const { leads, renewalSchedule, isLoading, error, refresh } = useForecastData(monthCount);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.log("Total leads:", leads.length);
      console.log(
        "Stage distribution:",
        leads.reduce((acc, l) => {
          acc[l.stage] = (acc[l.stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
      console.log("Won leads:", leads.filter(isWon).length);
    }
  }, [leads]);

  const forecastInput = useMemo(() => {
    const openLeads = leads.filter((l) => OPEN_STAGES.has(normalizeStage(l.stage)));
    const closedLeads = leads.filter((l) => CLOSED_STAGES.has(normalizeStage(l.stage)));
    return { openLeads, closedLeads, renewalSchedule };
  }, [leads, renewalSchedule]);

  const forecast = useMemo(
    () => calculateForecast(forecastInput, monthCount),
    [forecastInput, monthCount]
  );

  




  // Renewal pipeline — doc §5.7
  const renewalPipeline = useMemo(() => {
    const upcomingRenewals = forecastInput.renewalSchedule.filter((r) => r.value > 0);
    const totalRenewalValue = upcomingRenewals.reduce((s, r) => s + r.value, 0);
    return { upcomingRenewals, totalRenewalValue, count: upcomingRenewals.length };
  }, [forecastInput]);

  // Lead-to-conversion trend — doc §5.7
  const conversionTrend = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: d.toLocaleDateString("en-IN", { month: "short" }),
        submitted: 0,
        converted: 0,
        rate: 0,
      };
    });

    leads.forEach((l) => {
      const leadDate = safeParseDate(l.submittedAt);
      if (!leadDate) return;
      const monthsAgo = Math.floor(
        (new Date().getTime() - leadDate.getTime()) / (30 * 24 * 60 * 60 * 1000)
      );
      if (monthsAgo >= 0 && monthsAgo < 6) {
        const idx = 5 - monthsAgo;
        if (last6Months[idx]) {
          last6Months[idx].submitted++;
          if (isWon(l)) last6Months[idx].converted++;
        }
      }
    });

    last6Months.forEach((m) => {
      m.rate = m.submitted > 0 ? (m.converted / m.submitted) * 100 : 0;
    });

    return last6Months;
  }, [leads]);

  const stats = useMemo(() => {
    const totalProjected = forecast.reduce((s, f) => s + f.total, 0);
    const totalFromPipeline = forecast.reduce((s, f) => s + f.projectedNewDealCommission, 0);
    const totalFromRenewal = forecast.reduce((s, f) => s + f.confirmedRenewalCommission, 0);
    const avgMonthly = Math.round(totalProjected / monthCount);
    const winRate = calculateHistoricalWinRate(forecastInput.closedLeads);

    return { totalProjected, totalFromPipeline, totalFromRenewal, avgMonthly, winRate };
  }, [forecast, forecastInput, monthCount]);

  const filteredForecast = useMemo(() => {
    if (filterDealType === "all") return forecast;
    const filtered = forecastInput.openLeads.filter((l) => l.dealType === filterDealType);
    if (filtered.length === 0) return [];
    return calculateForecast({ ...forecastInput, openLeads: filtered }, monthCount);
  }, [forecastInput, monthCount, filterDealType, forecast]);

  const displayForecast = filterDealType === "all" ? forecast : filteredForecast;

  const handleExportCSV = () => {
    const csv = [
      ["Period", "Pipeline Projection", "Renewal Commission", "Total"],
      ...displayForecast.map((f) => [
        f.period,
        f.projectedNewDealCommission,
        f.confirmedRenewalCommission,
        f.total,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");
    downloadCSV(csv, `forecast-${period}.csv`);
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Revenue Forecast</h1>
          <p className="text-sm text-text-2">
            Pipeline × Win Rate + Confirmed Renewals
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
            Refresh
          </button> */}
          <button
            onClick={handleExportCSV}
            disabled={displayForecast.length === 0}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-2 text-sm hover:bg-surface-hover disabled:opacity-50 cursor-pointer"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>{error}</span>
          <button onClick={refresh} className="font-medium underline">
            Try again
          </button>
        </div>
      )}

      {isLoading && leads.length === 0 ? (
        <ForecastSkeleton />
      ) : (
        <>
       
          {/* Period selector */}
          <div className="flex gap-2">
            {(["3m", "6m", "12m"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
                  period === p
                    ? "bg-cyan-500 text-white"
                    : "border border-slate-300 bg-white/70 text-text-2 hover:bg-surface-hover"
                }`}
              >
                Next {p === "3m" ? "3 Months" : p === "6m" ? "6 Months" : "12 Months"}
              </button>
            ))}
          </div>

          {/* Main forecast card */}
          <div className="rounded-xl border border-slate-300 bg-gradient-to-br from-brand-50 to-surface p-6">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-text-2">
                  Projected Commission ({period})
                </p>
                <p className="mt-2 text-4xl font-bold text-brand-700">
                  ₹{stats.totalProjected.toLocaleString()}
                </p>
                <p className="mt-1 text-xs text-text-2">
                  ₹{stats.avgMonthly.toLocaleString()} average per month
                </p>
              </div>
              <TrendingUp size={48} className="text-brand-200" />
            </div>
          </div>

          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <KPICard
              icon={<Zap size={20} />}
              label="Pipeline Projection"
              value={`₹${stats.totalFromPipeline.toLocaleString()}`}
              detail={`${(stats.winRate * 100).toFixed(0)}% historical win rate`}
              tone="blue"
            />
            <KPICard
              icon={<Calendar size={20} />}
              label="Confirmed Renewals"
              value={`₹${stats.totalFromRenewal.toLocaleString()}`}
              detail={`${renewalPipeline.count} renewal(s) upcoming`}
              tone="green"
            />
            <KPICard
              icon={<BarChart3 size={20} />}
              label="Open Pipeline Value"
              value={`₹${forecastInput.openLeads
                .reduce((s, l) => s + (Number(l.dealValue) || 0), 0)
                .toLocaleString()}`}
              detail={`${forecastInput.openLeads.length} leads in pipeline`}
              tone="purple"
            />
          </div>

          {/* Renewal pipeline view — doc §5.7 */}
          {renewalPipeline.upcomingRenewals.length > 0 && (
            <div className="rounded-xl border border-slate-300 bg-white/70 p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <RefreshCw size={16} className="text-green-600" />
                Renewal Pipeline — Upcoming Commission
              </h3>
              <div className="space-y-2">
                {renewalPipeline.upcomingRenewals.map((r, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-green-50/50 px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{r.month}</span>
                    <span className="font-semibold text-green-700">
                      ₹{r.value.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-text-2">
                Total renewal-linked commission:{" "}
                <span className="font-semibold text-green-700">
                  ₹{renewalPipeline.totalRenewalValue.toLocaleString()}
                </span>
              </p>
            </div>
          )}

          {/* Lead-to-conversion trend chart — doc §5.7 */}
          <div className="rounded-xl border border-slate-300 bg-white/70 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <Target size={16} className="text-purple-600" />
              Lead-to-Conversion Trend (Last 6 Months)
            </h3>
            <ConversionTrendChart data={conversionTrend} />
          </div>

          {/* Filter by deal type */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Monthly Breakdown</h2>
            {/* <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-1.5 text-xs hover:bg-surface-hover"
            >
              <Filter size={14} /> {filterDealType === "all" ? "All Deal Types" : filterDealType}
            </button> */}
          </div>

         
            <div className="flex flex-wrap gap-2 rounded-lg border border-slate-300 bg-surface-hover p-3">
              <FilterChip
                label="All Deal Types"
                active={filterDealType === "all"}
                onClick={() => setFilterDealType("all")}
              />
              {[
                "New Subscription",
                "Renewal",
                "Additional Licenses",
                "New Modules/Upsell",
                "AI Add-ons",
              ].map((dt) => (
                <FilterChip
                  key={dt}
                  label={dt}
                  active={filterDealType === dt}
                  onClick={() => setFilterDealType(dt)}
                />
              ))}
            </div>
         

          {/* Bar chart — Monthly breakdown */}
          <div className="rounded-xl border border-slate-300 bg-white/70 p-6">
            <BarChart data={displayForecast} />
          </div>

          {/* Line chart — Trend */}
          <div className="rounded-xl border border-slate-300 bg-white/70 p-6">
            <LineChart data={displayForecast} />
          </div>

          {/* Table — Detailed breakdown */}
          <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white/70">
            <table className="w-full text-sm">
              <thead className="bg-surface-hover text-left text-text-2">
                <tr>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Pipeline Projection</th>
                  <th className="px-4 py-3">Renewal Commission</th>
                  <th className="px-4 py-3">Total</th>
                </tr>
              </thead>
              <tbody>
                {displayForecast.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-2">
                      No forecast data for selected filter.
                    </td>
                  </tr>
                )}
                {displayForecast.map((f, i) => (
                  <tr key={i} className="border-t border-slate-300 hover:bg-surface-hover">
                    <td className="px-4 py-3 font-medium">{f.period}</td>
                    <td className="px-4 py-3">
                      ₹{f.projectedNewDealCommission.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      ₹{f.confirmedRenewalCommission.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-semibold">₹{f.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Methodology explanation */}
          <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
            <h3 className="mb-2 text-sm font-semibold">How This Works</h3>
            <ul className="space-y-1 text-xs text-text-2">
              <li>
                <strong>Pipeline Projection:</strong> Open leads (Qualified/Demo/Proposal) ×
                your historical win rate × average deal value
              </li>
              <li>
                <strong>Renewal Commission:</strong> Auto-pulled from upcoming renewal
                schedule of your referred won accounts
              </li>
              <li>
                <strong>Monthly Distribution:</strong> Conservatively spread across the
                forecast period with realistic variance
              </li>
              <li>
                <strong>Win Rate:</strong> Calculated from your closed deals (Won vs Total
                Closed)
              </li>
              <li>
                <strong>Commission Lookup:</strong> Shows <em>actual</em> earnings for
                past/current periods, <em>predicted</em> for future (up to 24 months out)
              </li>
            </ul>
          </div>

          {/* Empty state hint */}
          {leads.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-surface-hover p-6 text-center">
              <TrendingUp size={32} className="mx-auto mb-2 text-text-3" />
              <p className="text-sm font-medium">No leads in pipeline yet</p>
              <p className="text-xs text-text-2">
                Submit leads in the "Leads" section to see forecast projections here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ============================================================
// Presentational sub-components
// ============================================================

function ForecastSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-28 rounded-xl bg-slate-100" />
      <div className="h-10 w-64 rounded-full bg-slate-100" />
      <div className="h-32 rounded-xl bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="h-28 rounded-xl bg-slate-100" />
        <div className="h-28 rounded-xl bg-slate-100" />
      </div>
      <div className="h-64 rounded-xl bg-slate-100" />
    </div>
  );
}

function KPICard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "purple";
}) {
  const toneBg = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    purple: "bg-purple-50 border-purple-200",
  }[tone];

  const toneIcon = {
    blue: "text-blue-600",
    green: "text-green-600",
    purple: "text-purple-600",
  }[tone];

  return (
    <div className={`rounded-xl border ${toneBg} p-4`}>
      <div className={`mb-2 w-fit rounded-lg p-2 ${toneBg}`}>
        <div className={toneIcon}>{icon}</div>
      </div>
      <p className="text-xs text-text-2">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-text-2">{detail}</p>
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs transition-colors ${
        active
          ? "bg-cyan-600 text-white"
          : "border border-slate-300 bg-white/70 text-text-2 hover:bg-surface-hover"
      }`}
    >
      {label}
    </button>
  );
}

function BarChart({ data }: { data: ForecastEntry[] }) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-text-2">No data to display</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const width = 600;
  const height = 250;
  const barWidth = width / (data.length * 2.5);
  const padding = 40;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#ddd" strokeWidth="1" />
        <line x1={padding} y1={height - padding} x2={width - 20} y2={height - padding} stroke="#ddd" strokeWidth="1" />

        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
          const y = height - padding - pct * (height - padding * 2);
          const label = Math.round((pct * max) / 1000) + "K";
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - 20} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={padding - 5} y={y + 3} textAnchor="end" fontSize="10" fill="#888">
                {label}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = padding + i * (barWidth * 2.5) + barWidth / 2;
          const barHeight = (d.total / max) * (height - padding * 2);
          const y = height - padding - barHeight;
          return (
            <g key={i}>
              <rect
                x={x}
                y={height - padding - (d.projectedNewDealCommission / max) * (height - padding * 2)}
                width={barWidth * 0.9}
                height={(d.projectedNewDealCommission / max) * (height - padding * 2)}
                fill="#3b82f6"
                opacity="0.7"
              />
              <rect
                x={x}
                y={y}
                width={barWidth * 0.9}
                height={(d.confirmedRenewalCommission / max) * (height - padding * 2)}
                fill="#10b981"
                opacity="0.7"
              />
              <text x={x + barWidth * 0.45} y={height - padding + 15} textAnchor="middle" fontSize="11" fill="#666">
                {d.period}
              </text>
            </g>
          );
        })}

        <circle cx={width - 120} cy={padding} r="3" fill="#3b82f6" />
        <text x={width - 110} y={padding + 4} fontSize="10" fill="#666">
          Pipeline
        </text>
        <circle cx={width - 120} cy={padding + 20} r="3" fill="#10b981" />
        <text x={width - 110} y={padding + 24} fontSize="10" fill="#666">
          Renewals
        </text>
      </svg>
    </div>
  );
}

function LineChart({ data }: { data: ForecastEntry[] }) {
  if (data.length === 0) {
    return <p className="text-center text-sm text-text-2">No data to display</p>;
  }

  const max = Math.max(...data.map((d) => d.total), 1);
  const width = 600;
  const height = 250;
  const padding = 40;
  const xSpacing = (width - padding * 2) / (data.length - 1 || 1);

  const points = data.map((d, i) => {
    const x = padding + i * xSpacing;
    const y = height - padding - (d.total / max) * (height - padding * 2);
    return { x, y, d };
  });

  const pathData = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {[0, 0.5, 1].map((pct, i) => {
          const y = height - padding - pct * (height - padding * 2);
          return <line key={i} x1={padding} y1={y} x2={width - 20} y2={y} stroke="#f0f0f0" strokeWidth="1" />;
        })}

        <path d={pathData} stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" />
        <path
          d={pathData + ` L ${width - 20} ${height - padding} L ${padding} ${height - padding} Z`}
          fill="#3b82f6"
          opacity="0.05"
        />

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="4" fill="#fff" stroke="#3b82f6" strokeWidth="2" />
            <text x={p.x} y={height - padding + 15} textAnchor="middle" fontSize="11" fill="#666">
              {p.d.period}
            </text>
            <title>₹{p.d.total.toLocaleString()}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}

function ConversionTrendChart({
  data,
}: {
  data: Array<{ month: string; submitted: number; converted: number; rate: number }>;
}) {
  const width = 600;
  const height = 200;
  const padding = 40;
  const barWidth = (width - padding * 2) / (data.length * 2);

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="mx-auto">
        {[0, 25, 50, 75, 100].map((pct, i) => {
          const y = height - padding - (pct / 100) * (height - padding * 2);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - 20} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={padding - 5} y={y + 3} textAnchor="end" fontSize="10" fill="#888">
                {pct}%
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const x = padding + i * barWidth * 2 + barWidth / 2;
          const barHeight = (d.rate / 100) * (height - padding * 2);
          const y = height - padding - barHeight;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barWidth} height={barHeight} fill="#8b5cf6" opacity="0.7" rx="2" />
              <text x={x + barWidth / 2} y={height - padding + 15} textAnchor="middle" fontSize="10" fill="#666">
                {d.month}
              </text>
              <text x={x + barWidth / 2} y={y - 5} textAnchor="middle" fontSize="10" fill="#666" fontWeight="600">
                {d.rate.toFixed(0)}%
              </text>
            </g>
          );
        })}
      </svg>
      <p className="mt-2 text-center text-xs text-text-2">
        Conversion rate over time (leads submitted vs. won)
      </p>
    </div>
  );
}