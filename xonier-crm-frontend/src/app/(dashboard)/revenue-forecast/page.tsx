"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import api from "@/src/lib/axios";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";

type ForecastRow = { month: string; ownerId: string; ownerName: string; dealCount: number; amount: number; weightedAmount: number; missingProbabilityCount: number };
type Forecast = { rows: ForecastRow[]; undated: { dealCount: number; amount: number }; total: { dealCount: number; amount: number; weightedAmount: number; missingProbabilityCount: number }; fromMonth: string; toMonth: string };
const monthInput = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const currentMonth = () => monthInput(new Date());
const laterMonth = () => { const d = new Date(); d.setMonth(d.getMonth() + 11); return monthInput(d); };

export default function RevenueForecastPage() {
  const currency = useCompanyCurrency();
  const [fromMonth, setFromMonth] = useState(currentMonth);
  const [toMonth, setToMonth] = useState(laterMonth);
  const [ownerId, setOwnerId] = useState("all");
  const [report, setReport] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (toMonth < fromMonth) { setError("End month must be after start month."); return; }
    setLoading(true); setError("");
    try {
      const response = await api.get("/revenue-forecast", { params: { fromMonth, toMonth } });
      setReport(response.data.data);
    } catch { setReport(null); setError("Could not load revenue forecast. Please try again."); }
    finally { setLoading(false); }
  }, [fromMonth, toMonth]);
  useEffect(() => { void load(); }, [load]);
  const owners = useMemo(() => [...new Map((report?.rows || []).map(row => [row.ownerId, row.ownerName])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [report]);
  const rows = useMemo(() => (report?.rows || []).filter(row => ownerId === "all" || row.ownerId === ownerId), [report, ownerId]);
  const months = useMemo(() => {
    const grouped = new Map<string, ForecastRow[]>();
    for (const row of rows) grouped.set(row.month, [...(grouped.get(row.month) || []), row]);
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);
  const totals = rows.reduce((sum, row) => ({
    dealCount: sum.dealCount + row.dealCount, amount: sum.amount + row.amount,
    weightedAmount: sum.weightedAmount + row.weightedAmount,
    missingProbabilityCount: sum.missingProbabilityCount + row.missingProbabilityCount,
  }), { dealCount: 0, amount: 0, weightedAmount: 0, missingProbabilityCount: 0 });
  return <main className="space-y-6 p-6">
    <div><h1 className="text-2xl font-semibold text-slate-900 dark:text-white">Revenue forecast</h1><p className="mt-1 text-sm text-slate-500">Open deals by expected close month and assigned owner. Weighted forecast uses forecast probability, then deal probability.</p></div>
    <div className="flex flex-wrap items-end gap-4 rounded-xl bg-white p-5 dark:bg-slate-800">
      <label className="text-sm">From month<input type="month" value={fromMonth} onChange={event => setFromMonth(event.target.value)} className="mt-1 block rounded border p-2 dark:bg-slate-900" /></label>
      <label className="text-sm">To month<input type="month" value={toMonth} onChange={event => setToMonth(event.target.value)} className="mt-1 block rounded border p-2 dark:bg-slate-900" /></label>
      <label className="text-sm">Deal owner<select value={ownerId} onChange={event => setOwnerId(event.target.value)} className="mt-1 block min-w-48 rounded border p-2 dark:bg-slate-900"><option value="all">All visible owners</option>{owners.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <button onClick={() => void load()} disabled={loading} className="rounded bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50">Refresh</button>
    </div>
    {error && <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {loading ? <p className="text-sm text-slate-500">Loading forecast…</p> : report && <>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-white p-5 dark:bg-slate-800"><p className="text-sm text-slate-500">Open deals with close date</p><p className="mt-2 text-2xl font-semibold">{totals.dealCount}</p></div>
        <div className="rounded-xl bg-white p-5 dark:bg-slate-800"><p className="text-sm text-slate-500">Pipeline value</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(totals.amount, currency)}</p></div>
        <div className="rounded-xl bg-white p-5 dark:bg-slate-800"><p className="text-sm text-slate-500">Weighted forecast</p><p className="mt-2 text-2xl font-semibold">{formatCurrency(totals.weightedAmount, currency)}</p></div>
      </div>
      {totals.missingProbabilityCount > 0 && <p className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{totals.missingProbabilityCount} deal(s) have no probability. Their value is included in pipeline value but excluded from weighted forecast.</p>}
      {report.undated.dealCount > 0 && <p className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 dark:bg-slate-800 dark:text-slate-200">Across all visible owners, {report.undated.dealCount} open deal(s) have no expected close date ({formatCurrency(report.undated.amount, currency)}) and are outside the monthly forecast.</p>}
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-slate-800"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300"><tr><th className="p-4">Close month</th><th className="p-4">Deal owner</th><th className="p-4 text-right">Deals</th><th className="p-4 text-right">Pipeline value</th><th className="p-4 text-right">Weighted forecast</th></tr></thead><tbody>{months.length ? months.flatMap(([month, entries]) => entries.map((row, index) => <tr key={`${month}-${row.ownerId}`} className="border-b dark:border-slate-700"><td className="p-4">{index === 0 ? new Date(`${month}-01T00:00:00Z`).toLocaleDateString(undefined, { month: "long", year: "numeric", timeZone: "UTC" }) : ""}</td><td className="p-4">{row.ownerName}</td><td className="p-4 text-right">{row.dealCount}</td><td className="p-4 text-right">{formatCurrency(row.amount, currency)}</td><td className="p-4 text-right">{formatCurrency(row.weightedAmount, currency)}</td></tr>)) : <tr><td colSpan={5} className="p-8 text-center text-slate-500">No open deals in this date range.</td></tr>}</tbody></table></div>
    </>}
  </main>;
}
