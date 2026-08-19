"use client";

import { useMemo, useState } from "react";
import {
  CommissionLedgerEntry,
  LedgerStatus,
} from "@/src/types/referral/referral.type";
import {
  Download,
  Flag,
 
  Search,
  Clock,
  CheckCircle2,
  Wallet,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

// Extend the shared type locally with a few extra display fields —
// doesn't touch the shared contract, just adds optional UI metadata.
type LedgerEntry = CommissionLedgerEntry & {
  leadName?: string;
  date?: string;
  disputeReason?: string;
};

type CommissionRate = {
  id: string;
  dealType: string;
  /** Numeric % — single source of truth used for both display & calculations */
  rate: number;
  description: string;
};

/* ------------------------------------------------------------------ */
/* Config — Table 2.1 Commission Structure                            */
/* Update rates here (or via the in-app "Edit" control) and every      */
/* calculation across the page stays in sync automatically.            */
/* ------------------------------------------------------------------ */

const DEFAULT_COMMISSION_RATES: CommissionRate[] = [
  { id: "new_sub", dealType: "New Subscription (Year 1)", rate: 20, description: "of first-year subscription value" },
  { id: "renewal", dealType: "Renewal", rate: 10, description: "of renewal value" },
  { id: "add_license", dealType: "Additional Licenses", rate: 10, description: "of incremental value (existing account)" },
  { id: "upsell", dealType: "New Modules / Upsell", rate: 20, description: "of upsell value" },
  { id: "ai_addon", dealType: "AI Add-ons", rate: 20, description: "of add-on value" },
];

const MOCK_LEDGER: LedgerEntry[] = [
  { id: "1", leadName: "Acme Corp", dealType:"new_subscription", dealValue: 500000, percentage: 20, amount: 100000, status: "Paid", date: "2026-05-12" },
  { id: "2", leadName: "Bright Retail", dealType: "renewal", dealValue: 200000, percentage: 10, amount: 20000, status: "Approved", date: "2026-06-02" },
  { id: "3", leadName: "Delta Logistics", dealType: "additional_license", dealValue: 80000, percentage: 10, amount: 8000, status: "Pending Approval", date: "2026-06-20" },
  { id: "4", leadName: "Elevate HR", dealType: "upsell", dealValue: 150000, percentage: 20, amount: 30000, status: "Disputed", date: "2026-04-18", disputeReason: "Deal value mismatch with signed contract." },
  { id: "5", leadName: "FinEdge Solutions", dealType: "ai_addon", dealValue: 120000, percentage: 20, amount: 24000, status: "Paid", date: "2026-03-10" },
  { id: "6", leadName: "Greenfield Manufacturing", dealType: "new_subscription", dealValue: 350000, percentage: 20, amount: 70000, status: "Pending Approval", date: "2026-06-28" },
  { id: "7", leadName: "Horizon Textiles", dealType: "renewal", dealValue: 180000, percentage: 10, amount: 18000, status: "Approved", date: "2026-05-30" },
];

const statusStyles: Record<LedgerStatus, { badge: string; icon: React.ReactNode }> = {
  "Pending Approval": { badge: "bg-amber-100 text-amber-700", icon: <Clock size={12} /> },
  Approved: { badge: "bg-blue-100 text-blue-700", icon: <CheckCircle2 size={12} /> },
  Paid: { badge: "bg-green-100 text-green-700", icon: <Wallet size={12} /> },
  Disputed: { badge: "bg-red-100 text-red-700", icon: <AlertTriangle size={12} /> },
};

const STATUS_TABS: (LedgerStatus | "All")[] = ["All", "Pending Approval", "Approved", "Paid", "Disputed"];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function PartnerCommissions() {
  const {t}= useTranslation()
  const [entries, setEntries] = useState<LedgerEntry[]>(MOCK_LEDGER);
  const [rates, setRates] = useState<CommissionRate[]>(DEFAULT_COMMISSION_RATES);

  // Inline rate editing
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Filters
  const [statusFilter, setStatusFilter] = useState<LedgerStatus | "All">("All");
  const [search, setSearch] = useState("");

  // Dispute modal
  const [disputeTarget, setDisputeTarget] = useState<LedgerEntry | null>(null);
  const [disputeReason, setDisputeReason] = useState("");

  /* ---------------------------- Derived ---------------------------- */

  const totals = useMemo(() => {
    const pending = entries.filter((e) => e.status === "Pending Approval").reduce((s, e) => s + e.amount, 0);
    const approved = entries.filter((e) => e.status === "Approved").reduce((s, e) => s + e.amount, 0);
    const paid = entries.filter((e) => e.status === "Paid").reduce((s, e) => s + e.amount, 0);
    const disputed = entries.filter((e) => e.status === "Disputed").reduce((s, e) => s + e.amount, 0);
    return { pending, approved, paid, disputed };
  }, [entries]);

  // Simple forecast model per section 5.7:
  // pipeline-in-progress x historical win rate, plus already-confirmed (approved) commissions
  const HISTORICAL_WIN_RATE = 0.65;
  const forecastNextQuarter = useMemo(
    () => Math.round(totals.pending * HISTORICAL_WIN_RATE + totals.approved),
    [totals]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const matchesStatus = statusFilter === "All" || e.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        e.dealType.toLowerCase().includes(q) ||
        (e.leadName ?? "").toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [entries, statusFilter, search]);

  /* ---------------------------- Handlers ---------------------------- */

  function startEditRate(rate: CommissionRate) {
    setEditingRateId(rate.id);
    setEditValue(String(rate.rate));
  }

  function cancelEditRate() {
    setEditingRateId(null);
    setEditValue("");
  }

  function saveRate(rateId: string) {
    const numeric = parseFloat(editValue);
    if (isNaN(numeric) || numeric < 0 || numeric > 100) return;

    setRates((prev) => prev.map((r) => (r.id === rateId ? { ...r, rate: numeric } : r)));

    // Recompute amounts for entries still awaiting approval under this deal type,
    // so the rate change is reflected immediately without touching finalized entries.
    const changedRate = rates.find((r) => r.id === rateId);
    if (changedRate) {
      setEntries((prev) =>
        prev.map((e) =>
          e.dealType === changedRate.dealType && e.status === "Pending Approval"
            ? { ...e, percentage: numeric, amount: Math.round((e.dealValue * numeric) / 100) }
            : e
        )
      );
    }

    setEditingRateId(null);
    setEditValue("");
  }

  function openDispute(entry: LedgerEntry) {
    setDisputeTarget(entry);
    setDisputeReason("");
  }

  function submitDispute() {
    if (!disputeTarget) return;
    setEntries((prev) =>
      prev.map((e) =>
        e.id === disputeTarget.id
          ? { ...e, status: "Disputed", disputeReason: disputeReason || "No reason provided." }
          : e
      )
    );
    setDisputeTarget(null);
    setDisputeReason("");
  }

  function downloadStatement() {
    const header = ["Lead", "Deal Type", "Deal Value", "%", "Commission", "Status", "Date"];
    const rows = filteredEntries.map((e) => [
      e.leadName ?? "-",
      e.dealType,
      e.dealValue,
      `${e.percentage}%`,
      e.amount,
      e.status,
      e.date ?? "-",
    ]);
    const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `commission-statement-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  /* ------------------------------ UI ------------------------------ */

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Commissions</h1>
        <p className="text-sm text-text-2">Per-lead commission ledger and computed earnings</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Pending Approval" value={totals.pending} tone="amber" icon={<Clock size={18} />} />
        <SummaryCard label="Approved" value={totals.approved} tone="blue" icon={<CheckCircle2 size={18} />} />
        <SummaryCard label="Paid (Lifetime)" value={totals.paid} tone="green" icon={<Wallet size={18} />} />
        <SummaryCard
          label="Forecast (Next Qtr)"
          value={forecastNextQuarter}
          tone="violet"
          icon={<TrendingUp size={18} />}
          hint={`${Math.round(HISTORICAL_WIN_RATE * 100)}% win rate applied`}
        />
      </div>

      {/* Commission rate reference — Table 2.1, inline editable */}
      <div className="rounded-xl border border-slate-300 bg-white/70 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Your Commission Structure</h3>
          <span className="text-xs text-text-2">Rates apply automatically to new & pending entries</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rates.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg bg-surface-hover px-3 py-2.5 text-xs"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-text-1">{t(`${r.dealType}`)}</p>
                <p className="truncate text-text-2">{r.description}</p>
              </div>

            
                <div
        
                  className="flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-semibold text-primary hover:bg-white"
                  title="Edit rate"
                >
                  {r.rate}% 
                </div>
             
            </div>
          ))}
        </div>
      </div>

      {/* Filters + actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                statusFilter === tab
                  ? "border-primary bg-cyan-500 text-white"
                  : "border-slate-300 bg-white/70 text-text-2 hover:bg-surface-hover"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search lead or deal type..."
              className="rounded-lg border border-slate-300 bg-white/70 py-1.5 pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>
          <button
            onClick={downloadStatement}
            className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white/70 px-3 py-1.5 text-xs hover:bg-surface-hover"
          >
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* Ledger table */}
      <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white/70">
        <table className="w-full text-sm">
          <thead className="bg-surface-hover text-left text-text-2">
            <tr>
              <th className="px-4 py-3">Lead</th>
              <th className="px-4 py-3">Deal Type</th>
              <th className="px-4 py-3">Deal Value</th>
              <th className="px-4 py-3">%</th>
              <th className="px-4 py-3">Commission</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-text-2">
                  No commission entries match your filters.
                </td>
              </tr>
            )}
            {filteredEntries.map((e) => (
              <tr key={e.id} className="border-t border-slate-300 bg-white/70 align-top">
                <td className="px-4 py-3 font-medium">{e.leadName ?? "—"}</td>
                <td className="px-4 py-3">{t(`${e.dealType}`)}</td>
                <td className="px-4 py-3">₹{e.dealValue.toLocaleString()}</td>
                <td className="px-4 py-3">{e.percentage}%</td>
                <td className="px-4 py-3 font-medium">₹{e.amount.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs ${statusStyles[e.status].badge}`}
                  >
                    {statusStyles[e.status].icon}
                    {e.status}
                  </span>
                  {e.status === "Disputed" && e.disputeReason && (
                    <p className="mt-1 max-w-[200px] text-[11px] text-text-2">{e.disputeReason}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-text-2">{e.date ?? "—"}</td>
                <td className="px-4 py-3">
                  <button
                    disabled={e.status === "Disputed" || e.status === "Paid"}
                    onClick={() => openDispute(e)}
                    className="flex items-center gap-1 text-xs text-text-2 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Flag size={12} /> Dispute
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Dispute modal */}
      {disputeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-xl">
            <h3 className="text-sm font-semibold">Raise a dispute</h3>
            <p className="mt-1 text-xs text-text-2">
              Flagging <span className="font-medium">{disputeTarget.leadName}</span> — ₹
              {disputeTarget.amount.toLocaleString()} ({disputeTarget.dealType})
            </p>
            <textarea
              value={disputeReason}
              onChange={(e) => setDisputeReason(e.target.value)}
              placeholder="Describe the issue (e.g. incorrect deal value, wrong % applied)..."
              rows={4}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white/70 p-2 text-xs outline-none focus:border-primary"
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setDisputeTarget(null)}
                className="rounded-lg border border-slate-300 bg-white/70 px-3 py-1.5 text-xs hover:bg-surface-hover"
              >
                Cancel
              </button>
              <button
                onClick={submitDispute}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Summary Card                                                        */
/* ------------------------------------------------------------------ */

const TONE_STYLES: Record<string, { bg: string; text: string; iconBg: string }> = {
  amber: { bg: "bg-amber-50", text: "text-amber-700", iconBg: "bg-amber-100" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", iconBg: "bg-blue-100" },
  green: { bg: "bg-green-50", text: "text-green-700", iconBg: "bg-green-100" },
  violet: { bg: "bg-violet-50", text: "text-violet-700", iconBg: "bg-violet-100" },
};

function SummaryCard({
  label,
  value,
  tone,
  icon,
  hint,
}: {
  label: string;
  value: number;
  tone: keyof typeof TONE_STYLES;
  icon: React.ReactNode;
  hint?: string;
}) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={`rounded-xl border border-slate-300 p-4 ${styles.bg}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs text-text-2">{label}</p>
        <span className={`rounded-full p-1.5 ${styles.iconBg} ${styles.text}`}>{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${styles.text}`}>₹{value.toLocaleString()}</p>
      {hint && <p className="mt-1 text-[11px] text-text-2">{hint}</p>}
    </div>
  );
}