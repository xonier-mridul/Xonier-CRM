"use client";

import { useMemo, useState } from "react";
import { PartnerScorecard, PartnerTier } from "@/src/types/referral/referral.type";
import {
  Download,
  FileText,
  Search,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  Trophy,
  Check,
  X,
  Users,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Local extension — cohort fields the doc's §5.8 calls for            */
/* ("Cohort analysis: customer LTV and churn by referring partner")     */
/* Doesn't touch the shared type, just adds optional display metadata. */
/* ------------------------------------------------------------------ */

type Scorecard = PartnerScorecard & {
  avgLtv?: number;
  churnRate?: number; // 0–1
};

/* ------------------------------------------------------------------ */
/* Mock data — replace with API data once wired                        */
/* ------------------------------------------------------------------ */

const MOCK_SCORECARDS: Scorecard[] = [
  { partnerId: "1", partnerName: "Jeevant Global Solutions", tier: "strategic", leadsSubmitted: 24, conversionRate: 0.42, revenueGenerated: 1840000, suggestedTierAction: "none", avgLtv: 980000, churnRate: 0.04 },
  { partnerId: "2", partnerName: "NorthStar Consulting", tier: "reseller", leadsSubmitted: 19, conversionRate: 0.37, revenueGenerated: 1210000, suggestedTierAction: "upgrade", avgLtv: 720000, churnRate: 0.06 },
  { partnerId: "3", partnerName: "Vertex Channel Partners", tier: "referral", leadsSubmitted: 15, conversionRate: 0.33, revenueGenerated: 860000, suggestedTierAction: "upgrade", avgLtv: 540000, churnRate: 0.09 },
  { partnerId: "4", partnerName: "BluePeak Advisors", tier: "referral", leadsSubmitted: 6, conversionRate: 0.12, revenueGenerated: 180000, suggestedTierAction: "downgrade", avgLtv: 210000, churnRate: 0.21 },
  { partnerId: "5", partnerName: "Orbit HR Consultants", tier: "reseller", leadsSubmitted: 11, conversionRate: 0.28, revenueGenerated: 640000, suggestedTierAction: "none", avgLtv: 480000, churnRate: 0.11 },
];

type SortKey = "leadsSubmitted" | "conversionRate" | "revenueGenerated";

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

export default function AdminReports() {
  const [scorecards, setScorecards] = useState<Scorecard[]>(MOCK_SCORECARDS);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<"All" | string>("All");
  const [sortKey, setSortKey] = useState<SortKey>("revenueGenerated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const tiers = useMemo(
    () => Array.from(new Set(scorecards.map((s) => s.tier))),
    [scorecards]
  );

  /* ---------------------------- Derived ---------------------------- */

  const filteredSorted = useMemo(() => {
    const filtered = scorecards.filter((s) => {
      const q = search.trim().toLowerCase();
      const matchesSearch = !q || s.partnerName.toLowerCase().includes(q);
      const matchesTier = tierFilter === "All" || s.tier === tierFilter;
      return matchesSearch && matchesTier;
    });

    return [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      return (a[sortKey] - b[sortKey]) * dir;
    });
  }, [scorecards, search, tierFilter, sortKey, sortDir]);

  const totals = useMemo(() => {
    const totalRevenue = scorecards.reduce((s, p) => s + p.revenueGenerated, 0);
    const totalLeads = scorecards.reduce((s, p) => s + p.leadsSubmitted, 0);
    const avgConversion =
      scorecards.length > 0
        ? scorecards.reduce((s, p) => s + p.conversionRate, 0) / scorecards.length
        : 0;
    const pendingActions = scorecards.filter(
      (p) => p.suggestedTierAction && p.suggestedTierAction !== "none"
    ).length;
    return { totalRevenue, totalLeads, avgConversion, pendingActions };
  }, [scorecards]);

  const topThree = useMemo(
    () => [...scorecards].sort((a, b) => b.revenueGenerated - a.revenueGenerated).slice(0, 3),
    [scorecards]
  );

  /* ---------------------------- Handlers ---------------------------- */

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

function applyTierAction(
  partnerId: string,
  action: "upgrade" | "downgrade"
) {
  setScorecards((prev) =>
    prev.map((s) => {
      if (s.partnerId !== partnerId) return s;

      const tierOrder: PartnerTier[] = [
        "referral",
        "reseller",
        "strategic",
      ];

      const currentIndex = tierOrder.indexOf(s.tier);

      const nextIndex =
        action === "upgrade"
          ? Math.min(currentIndex + 1, tierOrder.length - 1)
          : Math.max(currentIndex - 1, 0);

      return {
        ...s,
        tier: tierOrder[nextIndex],
        suggestedTierAction: "none",
      };
    })
  );

  const partner = scorecards.find(
    (s) => s.partnerId === partnerId
  );

  setActionFeedback(
    `${partner?.partnerName ?? "Partner"} ${
      action === "upgrade" ? "upgraded" : "downgraded"
    } successfully.`
  );

  setTimeout(() => setActionFeedback(null), 3000);
}
  function dismissSuggestion(partnerId: string) {
    setScorecards((prev) =>
      prev.map((s) => (s.partnerId === partnerId ? { ...s, suggestedTierAction: "none" } : s))
    );
  }

  function handleExportCsv() {
    const header = ["Partner", "Tier", "Leads Submitted", "Conversion Rate", "Revenue Generated", "Avg LTV", "Churn Rate"];
    const rows = filteredSorted.map((s) => [
      s.partnerName,
      s.tier,
      s.leadsSubmitted,
      `${(s.conversionRate * 100).toFixed(1)}%`,
      s.revenueGenerated,
      s.avgLtv ?? "",
      s.churnRate != null ? `${(s.churnRate * 100).toFixed(1)}%` : "",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `partner-performance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExportPdf() {
    // Lightweight PDF export via browser print dialog (no extra deps required).
    window.print();
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div className="space-y-6 print:space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-semibold">Reporting & Analytics</h1>
          <p className="text-sm text-text-2">Partner leaderboard and performance scorecards</p>
        </div>
        <div className="flex items-center gap-2">
          {actionFeedback && (
            <span className="text-xs font-medium text-green-600">{actionFeedback}</span>
          )}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <FileText size={16} /> Export PDF
          </button>
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white/70 px-3 py-2 text-sm hover:bg-surface-hover"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4 print:grid-cols-4">
        <SummaryTile label="Total Revenue Generated" value={`₹${totals.totalRevenue.toLocaleString()}`} icon={<TrendingUp size={16} />} />
        <SummaryTile label="Total Leads Submitted" value={String(totals.totalLeads)} icon={<Users size={16} />} />
        <SummaryTile label="Avg Conversion Rate" value={`${(totals.avgConversion * 100).toFixed(1)}%`} icon={<ArrowUpDown size={16} />} />
        <SummaryTile
          label="Pending Tier Actions"
          value={String(totals.pendingActions)}
          icon={<Trophy size={16} />}
          tone={totals.pendingActions > 0 ? "amber" : undefined}
        />
      </div>

      {/* Leaderboard — doc §5.8 "Partner leaderboard by leads submitted, conversion rate, revenue generated" */}
      <div className="rounded-xl border border-slate-200 bg-white/70 p-4 print:hidden">
        <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <Trophy size={16} className="text-amber-500" /> Top Performing Partners
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {topThree.map((p, i) => (
            <div key={p.partnerId} className="rounded-lg border border-slate-200 bg-white/70 p-3">
              <div className="flex items-center justify-between">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-700">
                  #{i + 1}
                </span>
                <span className="rounded-full bg-surface-hover px-2 py-0.5 text-[11px] font-medium text-text-2">
                  {p.tier}
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-semibold">{p.partnerName}</p>
              <p className="text-xs text-text-2">
                ₹{p.revenueGenerated.toLocaleString()} · {(p.conversionRate * 100).toFixed(1)}% conv.
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div className="flex flex-wrap gap-2">
          {(["All", ...tiers] as const).map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                tierFilter === tier
                  ? "border-slate-700 bg-slate-700 text-white"
                  : "border-slate-200 bg-white/70 text-text-2 hover:bg-surface-hover"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-2" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search partner..."
            className="w-full rounded-lg border border-slate-200 bg-white/70 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-brand-600 sm:w-56"
          />
        </div>
      </div>

      {/* Scorecard table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white/70">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-left text-text-2">
            <tr>
              <th className="px-4 py-3">Partner</th>
              <th className="px-4 py-3">Tier</th>
              <SortableTh label="Leads Submitted" active={sortKey === "leadsSubmitted"} dir={sortDir} onClick={() => toggleSort("leadsSubmitted")} />
              <SortableTh label="Conversion Rate" active={sortKey === "conversionRate"} dir={sortDir} onClick={() => toggleSort("conversionRate")} />
              <SortableTh label="Revenue Generated" active={sortKey === "revenueGenerated"} dir={sortDir} onClick={() => toggleSort("revenueGenerated")} />
              <th className="px-4 py-3">Tier Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredSorted.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-text-2">
                  No partner data matches your filters.
                </td>
              </tr>
            )}
            {filteredSorted.map((s) => (
              <tr key={s.partnerId} className="border-t border-slate-200 bg-white/70">
                <td className="px-4 py-3 font-medium">{s.partnerName}</td>
                <td className="px-4 py-3">
                  <span className="rounded-full bg-surface-hover px-2 py-0.5 text-xs font-medium text-text-1">
                    {s.tier}
                  </span>
                </td>
                <td className="px-4 py-3">{s.leadsSubmitted}</td>
                <td className="px-4 py-3">{(s.conversionRate * 100).toFixed(1)}%</td>
                <td className="px-4 py-3">₹{s.revenueGenerated.toLocaleString()}</td>
                <td className="px-4 py-3">
                  {s.suggestedTierAction && s.suggestedTierAction !== "none" ? (
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs ${
                          s.suggestedTierAction === "upgrade"
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {s.suggestedTierAction === "upgrade" ? (
                          <TrendingUp size={12} />
                        ) : (
                          <TrendingDown size={12} />
                        )}
                        {s.suggestedTierAction}
                      </span>
                      <button
                        onClick={() =>
                          applyTierAction(s.partnerId, s.suggestedTierAction as "upgrade" | "downgrade")
                        }
                        className="rounded-md p-1 text-green-600 hover:bg-green-100"
                        title="Apply"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        onClick={() => dismissSuggestion(s.partnerId)}
                        className="rounded-md p-1 text-red-500 hover:bg-red-100"
                        title="Dismiss"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-text-2">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cohort analysis — doc §5.8 "Cohort analysis: customer LTV and churn by referring partner" */}
      <div className="rounded-xl border border-slate-200 bg-white/70 p-4">
        <h3 className="mb-1 text-sm font-semibold">Cohort Analysis by Referring Partner</h3>
        <p className="mb-3 text-xs text-text-2">Customer lifetime value and churn rate segmented by referral source</p>
        <div className="space-y-2">
          {filteredSorted.map((s) => (
            <div key={s.partnerId} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white/70 px-3 py-2.5 text-sm">
              <span className="font-medium">{s.partnerName}</span>
              <div className="flex items-center gap-6 text-xs text-text-2">
                <span>
                  Avg LTV: <span className="font-semibold text-text-1">₹{(s.avgLtv ?? 0).toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1">
                  Churn:{" "}
                  <span
                    className={`font-semibold ${
                      (s.churnRate ?? 0) > 0.15 ? "text-red-600" : "text-text-1"
                    }`}
                  >
                    {((s.churnRate ?? 0) * 100).toFixed(1)}%
                  </span>
                  {(s.churnRate ?? 0) > 0.15 && <TrendingDown size={12} className="text-red-600" />}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function SortableTh({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
}) {
  return (
    <th className="px-4 py-3">
      <button onClick={onClick} className="flex items-center gap-1 hover:text-text-1">
        {label}
        <ArrowUpDown size={12} className={active ? "text-brand-600" : "opacity-40"} />
        {active && <span className="sr-only">{dir}</span>}
      </button>
    </th>
  );
}

function SummaryTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  tone?: "amber";
}) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white/70 p-3.5 ${tone === "amber" ? "bg-amber-50" : ""}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-2">{label}</p>
        <span className={`rounded-full p-1.5 ${tone === "amber" ? "bg-amber-100 text-amber-700" : "bg-surface-hover text-text-2"}`}>
          {icon}
        </span>
      </div>
      <p className={`mt-1.5 text-lg font-semibold ${tone === "amber" ? "text-amber-700" : "text-text-1"}`}>
        {value}
      </p>
    </div>
  );
}