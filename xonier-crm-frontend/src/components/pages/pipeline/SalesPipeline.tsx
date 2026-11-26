"use client";

import { LeadKanbanSkeleton } from "@/src/components/pages/lead/LeadKanbanBoard";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDealStages, useLeadStatuses } from "@/src/hooks/useLeadStatuses";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import dealService from "@/src/services/deal.service";
import LeadService from "@/src/services/lead.service";
import { QuoteService } from "@/src/services/quote.service";
import InvoiceService from "@/src/services/invoice.service";
import api from "@/src/lib/axios";
import { Lead } from "@/src/types/leads/leads.types";
import { Deal } from "@/src/types/deals/deal.types";
import { ArrowUpRight, BriefcaseBusiness, CircleDollarSign, ClipboardList, Search, CalendarDays, UserRound, AlertCircle, Users, TrendingUp, FileText, Receipt, Filter } from "lucide-react";

const closed = new Set(["won", "closed_won", "lost", "closed_lost"]);
const leadStages = [
  { key: "prospect", name: "Prospect", dot: "bg-cyan-500", action: "First outreach" },
  { key: "connection", name: "Connection", dot: "bg-blue-500", action: "Qualification conversation" },
  { key: "qualification", name: "Qualification", dot: "bg-violet-500", action: "Schedule a meeting or disqualify" },
  { key: "meeting_scheduled", name: "Meeting scheduled", dot: "bg-emerald-500", action: "Hold the meeting and convert to Deal" },
];
const stageKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, "_");

// Fetch page 1, then the remaining pages in small parallel batches (keeps well under API rate limits).
async function fetchAllPages<T>(
  fetchPage: (page: number) => Promise<{ data: T[]; totalPages: number }>,
  concurrency = 3,
): Promise<T[]> {
  const first = await fetchPage(1);
  const all: T[] = [...first.data];
  const totalPages = Number(first.totalPages || 1);
  const remaining = Array.from({ length: Math.max(totalPages - 1, 0) }, (_, i) => i + 2);
  for (let i = 0; i < remaining.length; i += concurrency) {
    const batch = await Promise.all(remaining.slice(i, i + concurrency).map(fetchPage));
    batch.forEach(result => all.push(...result.data));
  }
  return all;
}
const preSalesStageAliases: Readonly<Record<string, string | undefined>> = {
  new: "prospect",
  prospecting: "prospect",
  response: "connection",
  meeting: "meeting_scheduled",
};

interface PreSalesPipelineProps {
  leads: Lead[];
  statuses: ReturnType<typeof useLeadStatuses>["statuses"];
  loading: boolean;
  error: string;
  onRetry: () => void;
}

function PreSalesPipeline({ leads, statuses, loading, error, onRetry }: PreSalesPipelineProps) {
  const [query, setQuery] = useState("");

  if (loading) return <LeadKanbanSkeleton />;
  if (error) return <p role="alert" className="p-6 text-sm">{error} <button onClick={onRetry} className="underline">Retry</button></p>;

  const statusByKey = new Map(statuses.map(status => [status.key, status]));
  const active = leads.filter(lead => {
    const status = statusByKey.get(lead.status);
    const name = stageKey(status?.name ?? lead.status);
    return !lead.inDeal && !lead.deletedAt && !lead.disqualifiedAt &&
      !closed.has(lead.status) && status?.type !== "final" &&
      !["qualified", "disqualified", "archived"].includes(name);
  });
  const resolveStage = (lead: Lead) => {
    const configured = stageKey(statusByKey.get(lead.status)?.name ?? lead.status);
    return preSalesStageAliases[configured] ?? configured;
  };
  const leadCard = (lead: Lead) => (
    <article key={lead.id} className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <Link className="block break-words text-sm font-semibold text-slate-800 hover:text-cyan-700 dark:text-slate-100" href={`/leads/view/${lead.id}`}>{lead.fullName?.trim() || lead.lead_id || "Unnamed lead"}</Link>
      {(lead.organization?.name || lead.companyName) && <p className="mt-1 break-words text-xs text-slate-500 dark:text-slate-400">{lead.organization?.name || lead.companyName}</p>}
      <div className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">
        <p className="break-words">Source: {lead.source || lead.leadSource || "Not recorded"}</p>
        <p className="flex items-start gap-1.5"><UserRound size={14} className="shrink-0 text-slate-400" /><span>{lead.assignedTo?.map(owner => [owner.firstName, owner.lastName].filter(Boolean).join(" ")).join(", ") || "Unassigned"}</span></p>
        {lead.followUpAt && <p className="flex items-center gap-1.5"><CalendarDays size={14} /> Follow-up: {new Date(lead.followUpAt).toLocaleDateString("pt-BR")}</p>}
      </div>
    </article>
  );
  const search = query.trim().toLowerCase();
  const visible = active.filter(lead => !search || [lead.fullName, lead.lead_id, lead.email, lead.organization?.name, lead.companyName].some(value => value?.toLowerCase().includes(search)));
  const legacy = visible.filter(lead => !leadStages.some(stage => stage.key === resolveStage(lead)));

  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-600"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />Sales workspace</div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Pre-sales pipeline</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Work leads from first outreach through to a scheduled meeting.</p>
      </div>
      <Link href="/leads" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-600 dark:text-slate-200">Manage leads <ArrowUpRight size={16} /></Link>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">
      {[
        { label: "Active leads", value: active.length, detail: "Across all pre-sales stages", Icon: UserRound, icon: "bg-cyan-100 text-cyan-700", surface: "border-cyan-100 bg-cyan-50/60 dark:border-cyan-900 dark:bg-cyan-950/20" },
        { label: "Meeting scheduled", value: active.filter(lead => resolveStage(lead) === "meeting_scheduled").length, detail: "Leads in the meeting stage", Icon: CalendarDays, icon: "bg-blue-100 text-blue-700", surface: "border-blue-100 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20" },
        { label: "Unassigned leads", value: active.filter(lead => !lead.assignedTo?.length).length, detail: "Active leads without an owner", Icon: ClipboardList, icon: "bg-amber-100 text-amber-700", surface: "border-amber-100 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20" },
      ].map(({ label, value, detail, Icon, icon, surface }) => (
        <div key={label} className={`flex items-center gap-4 rounded-xl border p-4 ${surface}`}>
          <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${icon}`}><Icon size={21} /></span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</p>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{detail}</p>
          </div>
        </div>
      ))}
    </div>
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700">
      <h2 className="text-base font-semibold text-slate-800 dark:text-white">Lead stages</h2>
      <div className="relative w-full sm:w-72">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="search" aria-label="Search leads or companies" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search leads or companies" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white" />
      </div>
    </div>
    <div className="mt-5 flex gap-4 overflow-x-auto pb-4">
      {leadStages.map(stage => {
        const cards = visible.filter(lead => resolveStage(lead) === stage.key);
        return <section key={stage.key} className="flex max-h-[min(650px,65dvh)] w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50">
          <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-slate-100"><span className={`h-2.5 w-2.5 shrink-0 rounded-full ${stage.dot}`} />{stage.name}</h3>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">{cards.length}</span>
            </div>
            <p className="mt-2 pl-[18px] text-xs text-slate-500 dark:text-slate-400">{stage.action}</p>
          </header>
          <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-y-contain p-2.5 custom-scrollbar">{cards.length ? cards.map(leadCard) : <p className="px-3 py-8 text-center text-xs text-slate-500">{search ? "No matching leads" : "No leads in this stage"}</p>}</div>
        </section>;
      })}
    </div>
    {legacy.length > 0 && <details className="mt-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <summary className="cursor-pointer text-sm">Leads in other stages ({legacy.length})</summary>
      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{legacy.map(leadCard)}</div>
    </details>}
  </div>;
}

function PipelineTopStats() {
  const currency = useCompanyCurrency();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    leads: number | null;
    deals: number | null;
    forecastWeighted: number | null;
    forecastTotal: number | null;
    quotations: number | null;
    invoices: number | null;
  }>({
    leads: null,
    deals: null,
    forecastWeighted: null,
    forecastTotal: null,
    quotations: null,
    invoices: null,
  });

  useEffect(() => {
    let active = true;
    const now = new Date();
    const later = new Date(now);
    later.setMonth(later.getMonth() + 11);
    const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

    Promise.allSettled([
      LeadService.getAll(1, 1),
      dealService.getAll(1, 1),
      api.get("/revenue-forecast", { params: { fromMonth: fmt(now), toMonth: fmt(later) } }),
      QuoteService.getAll(1, 1),
      InvoiceService.getAll(1, 1),
    ]).then(([leadsRes, dealsRes, forecastRes, quotesRes, invoicesRes]) => {
      if (!active) return;
      const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
      const extractTotal = (payload: any) =>
        num(payload?.total) ?? (num(payload?.limit) === 1 ? num(payload?.totalPages) : null);
      const forecastTotalObj = forecastRes.status === "fulfilled" ? forecastRes.value?.data?.data?.total : null;
      setStats({
        leads: leadsRes.status === "fulfilled" ? extractTotal(leadsRes.value?.data?.data) : null,
        deals: dealsRes.status === "fulfilled" ? extractTotal(dealsRes.value?.data?.data) : null,
        forecastWeighted: num(forecastTotalObj?.weightedAmount),
        forecastTotal: num(forecastTotalObj?.amount),
        quotations: quotesRes.status === "fulfilled" ? extractTotal(quotesRes.value?.data?.data) : null,
        invoices: invoicesRes.status === "fulfilled" ? extractTotal(invoicesRes.value?.data?.data) : null,
      });
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  const cards = [
    {
      label: "Leads",
      value: loading ? "…" : stats.leads != null ? stats.leads.toLocaleString() : "—",
      detail: "Total leads in CRM",
      href: "/leads",
      Icon: Users,
      iconClass: "bg-cyan-50 text-cyan-600 ring-1 ring-cyan-200/70 dark:bg-cyan-950/60 dark:text-cyan-400 dark:ring-cyan-800/60",
      accentBar: "from-cyan-500 to-teal-400",
    },
    {
      label: "Deals",
      value: loading ? "…" : stats.deals != null ? stats.deals.toLocaleString() : "—",
      detail: "Total deals tracked",
      href: "/deals",
      Icon: BriefcaseBusiness,
      iconClass: "bg-blue-50 text-blue-600 ring-1 ring-blue-200/70 dark:bg-blue-950/60 dark:text-blue-400 dark:ring-blue-800/60",
      accentBar: "from-blue-500 to-indigo-400",
    },
    {
      label: "Revenue forecast",
      value: loading ? "…" : stats.forecastWeighted != null ? formatCurrency(stats.forecastWeighted, currency) : "—",
      detail: loading
        ? "Loading 12-mo outlook"
        : stats.forecastTotal != null
          ? `Pipeline: ${formatCurrency(stats.forecastTotal, currency)}`
          : "12-month weighted",
      href: "/revenue-forecast",
      Icon: TrendingUp,
      iconClass: "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-400 dark:ring-emerald-800/60",
      accentBar: "from-emerald-500 to-teal-400",
    },
    {
      label: "Quotations",
      value: loading ? "…" : stats.quotations != null ? stats.quotations.toLocaleString() : "—",
      detail: "Proposals generated",
      href: "/quotations",
      Icon: FileText,
      iconClass: "bg-violet-50 text-violet-600 ring-1 ring-violet-200/70 dark:bg-violet-950/60 dark:text-violet-400 dark:ring-violet-800/60",
      accentBar: "from-violet-500 to-purple-400",
    },
    {
      label: "Invoice",
      value: loading ? "…" : stats.invoices != null ? stats.invoices.toLocaleString() : "—",
      detail: "Invoices issued",
      href: "/invoice",
      Icon: Receipt,
      iconClass: "bg-amber-50 text-amber-600 ring-1 ring-amber-200/70 dark:bg-amber-950/60 dark:text-amber-400 dark:ring-amber-800/60",
      accentBar: "from-amber-500 to-orange-400",
    },
  ];

  return (
    <section aria-label="Sales overview stats" className="px-3 pt-4 sm:px-5 lg:px-6">
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map(({ label, value, detail, href, Icon, iconClass, accentBar }) => (
          <Link
            key={label}
            href={href}
            className="group relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
          >
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accentBar} opacity-85 transition-opacity group-hover:opacity-100`} />
            <div className="flex items-start justify-between gap-3 pt-1">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                <Icon size={19} />
              </span>
              <ArrowUpRight
                size={15}
                className="text-slate-300 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-slate-500 dark:text-slate-600 dark:group-hover:text-slate-300"
              />
            </div>
            <div className="mt-3.5 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {label}
              </p>
              <p className="mt-1 truncate text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                {value}
              </p>
              <p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">
                {detail}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

interface FunnelStage {
  key: string;
  label: string;
  phase: "leads" | "deals";
  count: number;
  sublabel: string;
  color: string;
  dotClass: string;
}

function HorizontalSalesFunnel({
  stages,
  loading,
  activeView,
  onSelectPhase,
  totalLeads,
  totalOpenDeals,
  wonDealsCount,
}: {
  stages: FunnelStage[];
  loading: boolean;
  activeView: "leads" | "deals";
  onSelectPhase: (phase: "leads" | "deals") => void;
  totalLeads: number;
  totalOpenDeals: number;
  wonDealsCount: number;
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const count = stages.length;

  // Classic horizontal funnel silhouette: wide mouth on the left smoothly tapering to a narrow spout on the right.
  const svgWidth = 1000;
  const svgHeight = 112;
  const midY = svgHeight / 2;
  const maxHalfH = svgHeight / 2 - 4;
  const minHalfH = 12;
  const colW = svgWidth / Math.max(count, 1);

  const boundaryHalfHeight = (stepIndex: number) => {
    const t = stepIndex / Math.max(count, 1);
    // Gentle concave funnel curve from 100% height at left mouth down to ~22% at right spout.
    const ratio = Math.pow(1 - t, 1.15);
    return minHalfH + (maxHalfH - minHalfH) * ratio;
  };

  const leadStagesCount = stages.filter(s => s.phase === "leads").length;

  return (
    <section aria-label="Horizontal sales funnel" className="px-3 pt-4 sm:px-5 lg:px-6">
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700 dark:bg-slate-700/70 dark:text-slate-200">
              <Filter size={17} />
            </span>
            <div>
              <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">
                Sales funnel
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Stage-by-stage progression across pre-sales leads and active deals
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => onSelectPhase("leads")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${
                activeView === "leads"
                  ? "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-cyan-500" />
              Pre-sales · Leads
              <span className="ml-0.5 font-bold tabular-nums">{loading ? "…" : totalLeads.toLocaleString()}</span>
            </button>
            <button
              type="button"
              onClick={() => onSelectPhase("deals")}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-medium transition ${
                activeView === "deals"
                  ? "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-300"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Sales · Deals
              <span className="ml-0.5 font-bold tabular-nums">
                {loading ? "…" : `${totalOpenDeals.toLocaleString()} open`}
                {!loading && wonDealsCount > 0 ? ` · ${wonDealsCount.toLocaleString()} won` : ""}
              </span>
            </button>
          </div>
        </div>

        <div className="mt-5 overflow-x-auto pb-1">
          <div className="min-w-[780px]">
            {/* Phase group headers */}
            <div className="mb-2 grid grid-cols-8 gap-0 text-[10px] font-semibold uppercase tracking-wider">
              <div
                className="flex items-center gap-2 border-b border-cyan-200/80 pb-1.5 pr-3 text-cyan-700 dark:border-cyan-900/80 dark:text-cyan-300"
                style={{ gridColumn: `span ${leadStagesCount} / span ${leadStagesCount}` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                Pre-sales · Leads
              </div>
              <div
                className="flex items-center gap-2 border-b border-indigo-200/80 pb-1.5 pl-3 text-indigo-700 dark:border-indigo-900/80 dark:text-indigo-300"
                style={{ gridColumn: `span ${count - leadStagesCount} / span ${count - leadStagesCount}` }}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Sales · Deals
              </div>
            </div>

            {/* Horizontal tapered SVG funnel ribbon */}
            <div className="relative my-2 h-[112px] w-full">
              {loading ? (
                <div className="h-full w-full animate-pulse rounded-xl bg-slate-100 dark:bg-slate-700/60" />
              ) : (
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  preserveAspectRatio="none"
                  className="h-full w-full overflow-visible"
                  role="img"
                  aria-label="Horizontal sales funnel chart"
                >
                  {stages.map((stage, idx) => {
                    const x1 = idx * colW;
                    const x2 = (idx + 1) * colW;
                    const leftH = boundaryHalfHeight(idx);
                    const rightH = boundaryHalfHeight(idx + 1);
                    const isHovered = hoveredKey === stage.key;
                    const points = `${x1},${midY - leftH} ${x2},${midY - rightH} ${x2},${midY + rightH} ${x1},${midY + leftH}`;

                    return (
                      <g
                        key={stage.key}
                        onMouseEnter={() => setHoveredKey(stage.key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        onClick={() => onSelectPhase(stage.phase)}
                        className="cursor-pointer"
                      >
                        <polygon
                          points={points}
                          fill={stage.color}
                          fillOpacity={hoveredKey ? (isHovered ? 0.96 : 0.62) : 0.88}
                          stroke="#ffffff"
                          strokeWidth={idx === leadStagesCount ? 3 : 1.5}
                          className="transition-opacity duration-200 dark:stroke-slate-800"
                        />
                      </g>
                    );
                  })}
                </svg>
              )}
            </div>

            {/* Stage counts & metadata aligned under each funnel segment */}
            <div className="grid grid-cols-8 divide-x divide-slate-100 dark:divide-slate-700/80">
              {stages.map((stage, idx) => {
                const isHovered = hoveredKey === stage.key;
                const isPhaseDivider = idx === leadStagesCount;
                return (
                  <button
                    key={stage.key}
                    type="button"
                    onMouseEnter={() => setHoveredKey(stage.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                    onClick={() => onSelectPhase(stage.phase)}
                    className={`group flex flex-col items-start px-2.5 py-2 text-left transition-colors ${
                      isPhaseDivider ? "border-l-2 border-l-slate-200 dark:border-l-slate-600" : ""
                    } ${
                      isHovered
                        ? "rounded-lg bg-slate-50 dark:bg-slate-700/40"
                        : "hover:rounded-lg hover:bg-slate-50/70 dark:hover:bg-slate-700/30"
                    }`}
                  >
                    <div className="flex w-full items-center gap-1.5">
                      <span className={`h-2 w-2 shrink-0 rounded-full ${stage.dotClass}`} />
                      <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {stage.label}
                      </span>
                    </div>
                    <span className="mt-1 text-xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      {loading ? "…" : stage.count.toLocaleString()}
                    </span>
                    <span className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {stage.sublabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SalesPipeline() {
  const [view, setView] = useState<"leads" | "deals">("leads");
  const { statuses: leadStatuses, loading: leadStagesLoading, error: leadStagesError, refresh: refreshLeadStages } = useLeadStatuses();
  const { statuses: dealStatuses, loading: dealStagesLoading, error: dealStagesError, refresh: refreshDealStages } = useDealStages();

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [leadsError, setLeadsError] = useState("");

  const [deals, setDeals] = useState<Deal[]>([]);
  const [dealsLoading, setDealsLoading] = useState(true);
  const [dealsError, setDealsError] = useState("");
  const [wonDealsCount, setWonDealsCount] = useState(0);

  const loadLeads = useCallback(async () => {
    setLeadsLoading(true);
    setLeadsError("");
    try {
      const all = await fetchAllPages<Lead>(async page => {
        const res = (await LeadService.getAll(page, 100, { pipeline: "active" })).data.data;
        return { data: res.data, totalPages: res.totalPages };
      });
      setLeads(all);
    } catch {
      setLeadsError("Unable to load leads.");
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  const loadDeals = useCallback(async () => {
    setDealsLoading(true);
    setDealsError("");
    try {
      const [allOpen, wonRes] = await Promise.all([
        fetchAllPages<Deal>(async page => {
          const res = (await dealService.getAll(page, 100, { pipeline_open: "true" })).data.data;
          return { data: res.data, totalPages: res.totalPages };
        }),
        dealService.getAll(1, 1, { stage: "won" }).catch(() => null),
      ]);
      setDeals(allOpen);
      const wonPayload = wonRes?.data?.data;
      const wonCount =
        typeof wonPayload?.total === "number"
          ? wonPayload.total
          : wonPayload?.limit === 1 && typeof wonPayload?.totalPages === "number"
            ? wonPayload.totalPages
            : 0;
      setWonDealsCount(wonCount);
    } catch {
      setDealsError("Unable to load deals. Please try again.");
    } finally {
      setDealsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
    void loadDeals();
  }, [loadLeads, loadDeals]);

  const { funnelStages, totalActiveLeads, totalOpenDeals } = useMemo(() => {
    const statusByKey = new Map(leadStatuses.map(status => [status.key, status]));
    const activeLeads = leads.filter(lead => {
      const status = statusByKey.get(lead.status);
      const name = stageKey(status?.name ?? lead.status);
      return !lead.inDeal && !lead.deletedAt && !lead.disqualifiedAt &&
        !closed.has(lead.status) && status?.type !== "final" &&
        !["qualified", "disqualified", "archived"].includes(name);
    });
    const resolveLeadStage = (lead: Lead) => {
      const configured = stageKey(statusByKey.get(lead.status)?.name ?? lead.status);
      return preSalesStageAliases[configured] ?? configured;
    };

    const activeDealStages = dealStatuses.filter(stage => stage.type !== "final" && !closed.has(stage.key));
    const openDealsList = deals.filter(
      d => !closed.has(d.dealStage) && !dealStatuses.some(s => s.key === d.dealStage && s.type === "final") && d.status !== "delete",
    );

    const resolveDealStageKey = (target: string) => {
      const found =
        activeDealStages.find(item => item.key === target || stageKey(item.name) === target) ??
        (target === "scoping" ? activeDealStages.find(item => item.key === "requirement_analysis") : undefined);
      return found?.key;
    };

    const pct = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)}%` : "0%");

    const leadFunnelColors = [
      { color: "#01728e", dotClass: "bg-cyan-500" },
      { color: "#0EA5E9", dotClass: "bg-sky-500" },
      { color: "#3B82F6", dotClass: "bg-blue-500" },
      { color: "#6366F1", dotClass: "bg-indigo-500" },
    ];

    const dealFunnelDefs = [
      { key: "scoping", label: "Scoping", color: "#8B5CF6", dotClass: "bg-violet-500" },
      { key: "proposal", label: "Proposal", color: "#A855F7", dotClass: "bg-purple-500" },
      { key: "negotiation", label: "Negotiation", color: "#D946EF", dotClass: "bg-fuchsia-500" },
    ];

    const leadStagesFunnel: FunnelStage[] = leadStages.map((stage, i) => {
      const stageCount = activeLeads.filter(lead => resolveLeadStage(lead) === stage.key).length;
      return {
        key: `lead_${stage.key}`,
        label: stage.name,
        phase: "leads",
        count: stageCount,
        sublabel: `${pct(stageCount, activeLeads.length)} of leads`,
        ...leadFunnelColors[i % leadFunnelColors.length],
      };
    });

    const dealStagesFunnel: FunnelStage[] = dealFunnelDefs.map(def => {
      const resolvedKey = resolveDealStageKey(def.key);
      const stageCount = resolvedKey ? openDealsList.filter(d => d.dealStage === resolvedKey).length : 0;
      return {
        key: `deal_${def.key}`,
        label: def.label,
        phase: "deals",
        count: stageCount,
        sublabel: `${pct(stageCount, openDealsList.length)} of open`,
        color: def.color,
        dotClass: def.dotClass,
      };
    });

    dealStagesFunnel.push({
      key: "deal_won",
      label: "Closed won",
      phase: "deals",
      count: wonDealsCount,
      sublabel: "Won deals",
      color: "#10B981",
      dotClass: "bg-emerald-500",
    });

    return {
      funnelStages: [...leadStagesFunnel, ...dealStagesFunnel],
      totalActiveLeads: activeLeads.length,
      totalOpenDeals: openDealsList.length,
    };
  }, [leads, leadStatuses, deals, dealStatuses, wonDealsCount]);

  return <div>
    <PipelineTopStats />
    <HorizontalSalesFunnel
      stages={funnelStages}
      loading={leadsLoading || leadStagesLoading || dealsLoading || dealStagesLoading}
      activeView={view}
      onSelectPhase={setView}
      totalLeads={totalActiveLeads}
      totalOpenDeals={totalOpenDeals}
      wonDealsCount={wonDealsCount}
    />
    <nav aria-label="Pipeline views" className="flex flex-wrap gap-2 px-3 pt-5 sm:px-5 lg:px-6">
      {([{ key: "leads", label: "Pre-sales · Leads" }, { key: "deals", label: "Sales · Deals" }] as const).map(option =>
        <button key={option.key} type="button" aria-pressed={view === option.key}
          onClick={() => setView(option.key)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${view === option.key ? "border-cyan-300 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
          {option.label}
        </button>)}
    </nav>
    {view === "leads" ? (
      <div className="p-3 sm:p-5 lg:p-6">
        <PreSalesPipeline
          leads={leads}
          statuses={leadStatuses}
          loading={leadsLoading || leadStagesLoading}
          error={leadStagesError || leadsError}
          onRetry={() => { void loadLeads(); void refreshLeadStages(); }}
        />
      </div>
    ) : (
      <DealPipeline
        deals={deals}
        statuses={dealStatuses}
        loading={dealsLoading}
        stagesLoading={dealStagesLoading}
        error={dealsError}
        stagesError={dealStagesError}
        onRetry={() => { void loadDeals(); void refreshDealStages(); }}
      />
    )}
  </div>;
}

interface DealPipelineProps {
  deals: Deal[];
  statuses: ReturnType<typeof useDealStages>["statuses"];
  loading: boolean;
  stagesLoading: boolean;
  error: string;
  stagesError: string;
  onRetry: () => void;
}

function DealPipeline({ deals, statuses, loading, stagesLoading, error, stagesError, onRetry }: DealPipelineProps) {
  const currency = useCompanyCurrency();
  const [query, setQuery] = useState("");
  const stages = useMemo(() => {
    const active = statuses.filter(stage => stage.type !== "final" && !closed.has(stage.key));
    return ["scoping", "proposal", "negotiation"].flatMap(key => {
      const stage = active.find(item => item.key === key || stageKey(item.name) === key) ??
        (key === "scoping" ? active.find(item => item.key === "requirement_analysis") : undefined);
      return stage ? [{ ...stage, name: key[0].toUpperCase() + key.slice(1) }] : [];
    });
  }, [statuses]);
  const openDeals = useMemo(() => deals.filter(d => !closed.has(d.dealStage) && !statuses.some(s => s.key === d.dealStage && s.type === "final") && d.status !== "delete"), [deals, statuses]);
  const visible = useMemo(() => openDeals.filter(d => [d.dealName, d.organization?.name, d.person?.fullName].some(v => v?.toLowerCase().includes(query.toLowerCase().trim()))), [openDeals, query]);
  const known = new Set(stages.map(s => s.key));
  const unassigned = visible.filter(d => !known.has(d.dealStage));
  const amount = (items: Deal[]) => formatCurrency(items.reduce((sum, d) => sum + (Number(d.amount) || 0), 0), currency);
  const stageProbByKey = useMemo(() => new Map(statuses.map(s => [s.key, s.probability])), [statuses]);
  const weightedForStage = (items: Deal[], stageProbability?: number | null) =>
    items.reduce((sum, deal) => {
      const probability = deal.forecastProbability ?? deal.dealProbability ?? stageProbability ?? stageProbByKey.get(deal.dealStage);
      return probability == null ? sum : sum + (Number(deal.amount) || 0) * Math.max(0, Math.min(100, probability)) / 100;
    }, 0);
  const totalWeighted = useMemo(() => weightedForStage(visible), [visible, stageProbByKey]);
  const negotiationStage = stages.find(stage => stage.name === "Negotiation");
  const negotiating = visible.filter(deal => deal.dealStage === negotiationStage?.key);
  const weighted = weightedForStage(negotiating, negotiationStage?.probability);
  const missingProbability = negotiating.filter(deal => (deal.forecastProbability ?? deal.dealProbability ?? negotiationStage?.probability) == null).length;
  return <div className="p-3 sm:p-5 lg:p-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-600"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500"/>Sales workspace</div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sales pipeline</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A clear view of your open opportunities and their next steps.</p></div><Link href="/deals" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">Manage deals <ArrowUpRight size={16}/></Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
      { label: "Open deals", value: visible.length, detail: "Active opportunities", Icon: BriefcaseBusiness, color: "bg-cyan-100 text-cyan-700", box: "border-cyan-100 bg-cyan-50/60 dark:bg-cyan-950/20" },
      { label: "Pipeline value", value: amount(visible), detail: `Weighted: ${formatCurrency(totalWeighted, currency)}`, Icon: CircleDollarSign, color: "bg-blue-100 text-blue-700", box: "border-blue-100 bg-blue-50/50 dark:bg-blue-950/20" },
      { label: "Needs a next step", value: visible.filter(d => !d.nextStep && !d.followUpAt).length, detail: "No next step or follow-up", Icon: ClipboardList, color: "bg-amber-100 text-amber-700", box: "border-amber-100 bg-amber-50/50 dark:bg-amber-950/20" },
    ].map(({ label, value, detail, Icon, color, box }) => <div key={label} className={`flex items-center gap-4 rounded-xl border p-4 ${box}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={21}/></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div></div>)}</div>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700"><div><h2 className="text-base font-bold text-slate-800 dark:text-white">Deal stages</h2><p className="mt-1 text-xs text-slate-500">View deals across each stage of your pipeline.</p></div><div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search pipeline" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search deals or contacts" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"/></div></div>
    {(error || stagesError) && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || stagesError} <button className="underline" onClick={onRetry}>Retry</button></div>}
    {!loading && !stagesLoading && !stagesError && <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
      {stages.length < 3 && <p>Stage setup needed: {["Scoping", "Proposal", "Negotiation"].filter(name => !stages.some(stage => stage.name === name)).join(", ")}.</p>}
      {negotiating.length > 0 && <p>Negotiation weighted value: {missingProbability === negotiating.length ? "Probability not recorded" : formatCurrency(weighted, currency)}{missingProbability > 0 && missingProbability < negotiating.length ? ` · ${missingProbability} without probability` : ""}</p>}
    </div>}
    {loading || stagesLoading ? <div className="mt-5"><LeadKanbanSkeleton label="Loading deals" /></div> : <div className="mt-5 flex gap-4 max-h-[min(650px,65dvh)] overflow-auto overscroll-contain pb-4">{stages.map(stage => { const items = visible.filter(d => d.dealStage === stage.key); const stageWeighted = weightedForStage(items, stage.probability); const stageMissingProb = items.filter(d => (d.forecastProbability ?? d.dealProbability ?? stage.probability) == null).length; return <section key={stage.key} className="w-[280px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50"><div className="sticky top-0 z-10 rounded-t-xl border-b border-slate-200 bg-white px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }}/><span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{stage.name}</span>{stage.probability != null && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">{stage.probability}%</span>}</div><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-200">{items.length}</span></div><div className="mt-2.5 grid grid-cols-2 gap-2 border-t border-slate-100 pt-2.5 text-xs tabular-nums dark:border-slate-700"><div><span className="block text-[10px] uppercase tracking-wide text-slate-400">Total</span><span className="font-semibold text-slate-700 dark:text-slate-200">{amount(items)}</span></div><div className="text-right"><span className="block text-[10px] uppercase tracking-wide text-slate-400">Weighted{stageMissingProb > 0 ? ` (${stageMissingProb} no %)` : ""}</span><span className="font-bold text-cyan-700 dark:text-cyan-400">{formatCurrency(stageWeighted, currency)}</span></div></div></div><div className="min-h-36 space-y-2.5 p-2.5">{items.map(deal => <article key={deal.id} className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm hover:shadow-md dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-2"><Link href={`/deals/view/${deal.id}`} className="min-w-0 text-sm font-semibold leading-5 text-slate-800 hover:text-cyan-700 dark:text-slate-100">{deal.dealName || "Unnamed deal"}</Link></div><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><UserRound size={13} className="shrink-0 text-slate-400"/><span className="truncate">{[deal.organization?.name, deal.person?.fullName].filter(Boolean).join(" · ") || "No linked contact"}</span></p><p className="mt-4 text-base font-bold text-slate-900 dark:text-white">{deal.amount != null ? formatCurrency(Number(deal.amount), currency) : "Value not set"}</p><div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700"><p className={`flex items-start gap-1.5 text-xs ${deal.nextStep ? "text-slate-600 dark:text-slate-300" : "text-amber-700 dark:text-amber-400"}`}><AlertCircle size={13} className="mt-0.5 shrink-0"/><span>{deal.nextStep ? `Next: ${deal.nextStep}` : "No next step recorded"}</span></p>{deal.followUpAt && <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>Follow-up: {new Date(deal.followUpAt).toLocaleDateString()}</p>}{deal.closeDate && <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>Close: {new Date(deal.closeDate).toLocaleDateString()}</p>}</div></article>)}{items.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400">No deals in this stage</p>}</div></section> })}</div>}
    {!loading && !stagesLoading && unassigned.length > 0 && <details className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
      <summary className="cursor-pointer">Deals in other stages ({unassigned.length})</summary>
      <ul className="mt-3 space-y-2">{unassigned.map(deal => <li key={deal.id}>
        <Link className="text-cyan-700 underline dark:text-cyan-300" href={`/deals/view/${deal.id}`}>{deal.dealName || "Unnamed deal"}</Link>
        <span className="ml-2 text-slate-500">{statuses.find(stage => stage.key === deal.dealStage)?.name || deal.dealStage}</span>
      </li>)}</ul>
    </details>}
  </div></div>;
}
