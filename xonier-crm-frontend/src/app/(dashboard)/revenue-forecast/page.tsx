"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  CalendarClock,
  CalendarDays,
  ChevronDown,
  CircleDollarSign,
  RefreshCw,
  TrendingUp,
  UserRound,
} from "lucide-react";
import api from "@/src/lib/axios";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";

type ForecastRow = {
  month: string;
  ownerId: string;
  ownerName: string;
  dealCount: number;
  amount: number;
  weightedAmount: number;
  missingProbabilityCount: number;
};

type Forecast = {
  rows: ForecastRow[];
  undated: { dealCount: number; amount: number };
  total: {
    dealCount: number;
    amount: number;
    weightedAmount: number;
    missingProbabilityCount: number;
  };
  fromMonth: string;
  toMonth: string;
};

const monthInput = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
const currentMonth = () => monthInput(new Date());
const laterMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 11);
  return monthInput(d);
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

export default function RevenueForecastPage() {
  const currency = useCompanyCurrency();
  const [fromMonth, setFromMonth] = useState(currentMonth);
  const [toMonth, setToMonth] = useState(laterMonth);
  const [ownerId, setOwnerId] = useState("all");
  const [report, setReport] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (toMonth < fromMonth) {
      setError("End month must be after start month.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/revenue-forecast", {
        params: { fromMonth, toMonth },
      });
      setReport(response.data.data);
    } catch {
      setReport(null);
      setError("Could not load revenue forecast. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [fromMonth, toMonth]);

  useEffect(() => {
    void load();
  }, [load]);

  const owners = useMemo(
    () =>
      [
        ...new Map(
          (report?.rows || []).map((row) => [row.ownerId, row.ownerName])
        ).entries(),
      ].sort((a, b) => a[1].localeCompare(b[1])),
    [report]
  );

  const rows = useMemo(
    () =>
      (report?.rows || []).filter(
        (row) => ownerId === "all" || row.ownerId === ownerId
      ),
    [report, ownerId]
  );

  const months = useMemo(() => {
    const grouped = new Map<string, ForecastRow[]>();
    for (const row of rows) {
      grouped.set(row.month, [...(grouped.get(row.month) || []), row]);
    }
    return [...grouped.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [rows]);

  const totals = rows.reduce(
    (sum, row) => ({
      dealCount: sum.dealCount + row.dealCount,
      amount: sum.amount + row.amount,
      weightedAmount: sum.weightedAmount + row.weightedAmount,
      missingProbabilityCount:
        sum.missingProbabilityCount + row.missingProbabilityCount,
    }),
    {
      dealCount: 0,
      amount: 0,
      weightedAmount: 0,
      missingProbabilityCount: 0,
    }
  );

  const weightedPct =
    totals.amount > 0
      ? Math.round((totals.weightedAmount / totals.amount) * 100)
      : 0;

  return (
    <main className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
            Sales analytics
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Revenue forecast
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Open deals grouped by expected close month and assigned owner.
            Weighted forecast uses forecast probability, then deal probability.
          </p>
        </div>

        <Link
          href="/deals"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-xs transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:text-cyan-300"
        >
          Manage deals
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Filters */}
      <section className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs dark:border-slate-700/80 dark:bg-slate-800 sm:p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-[170px] flex-1 sm:flex-none">
            <label
              htmlFor="forecast-from-month"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              From month
            </label>
            <input
              id="forecast-from-month"
              type="month"
              value={fromMonth}
              onChange={(event) => setFromMonth(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            />
          </div>

          <div className="min-w-[170px] flex-1 sm:flex-none">
            <label
              htmlFor="forecast-to-month"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              To month
            </label>
            <input
              id="forecast-to-month"
              type="month"
              value={toMonth}
              onChange={(event) => setToMonth(event.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
            />
          </div>

          <div className="min-w-[210px] flex-1 sm:flex-none">
            <label
              htmlFor="forecast-owner"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Deal owner
            </label>
            <div className="relative">
              <select
                id="forecast-owner"
                value={ownerId}
                onChange={(event) => setOwnerId(event.target.value)}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50/70 pl-3 pr-9 text-sm font-medium text-slate-800 outline-none transition focus:border-cyan-500 focus:bg-white focus:ring-2 focus:ring-cyan-500/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:focus:border-cyan-400"
              >
                <option value="all">All visible owners</option>
                {owners.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white shadow-xs transition hover:bg-cyan-700 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200"
        >
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-2xl border border-slate-200/80 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"
              >
                <div className="h-3 w-28 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-4 h-7 w-36 rounded bg-slate-200 dark:bg-slate-700" />
                <div className="mt-3 h-2.5 w-24 rounded bg-slate-100 dark:bg-slate-700/60" />
              </div>
            ))}
          </div>
          <div className="h-64 animate-pulse rounded-2xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-800" />
        </div>
      ) : (
        report && (
          <>
            {/* KPI Summary Cards */}
            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Open deals with close date
                    </p>
                    <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                      {totals.dealCount}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600 ring-1 ring-cyan-100 dark:bg-cyan-950/50 dark:text-cyan-400 dark:ring-cyan-900/60">
                    <BriefcaseBusiness className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  {months.length > 0
                    ? `Across ${months.length} active forecast month${months.length > 1 ? "s" : ""}`
                    : "No scheduled deals in selected range"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Pipeline value
                    </p>
                    <p className="mt-2.5 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                      {formatCurrency(totals.amount, currency)}
                    </p>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100 dark:bg-blue-950/50 dark:text-blue-400 dark:ring-blue-900/60">
                    <CircleDollarSign className="h-5 w-5" />
                  </span>
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Total unweighted value of dated open deals
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition hover:shadow-md dark:border-slate-700/80 dark:bg-slate-800">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                      Weighted forecast
                    </p>
                    <div className="mt-2.5 flex flex-wrap items-baseline gap-2.5">
                      <p className="text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-white">
                        {formatCurrency(totals.weightedAmount, currency)}
                      </p>
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-900/60">
                        {weightedPct}% ratio
                      </span>
                    </div>
                  </div>
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-400 dark:ring-emerald-900/60">
                    <TrendingUp className="h-5 w-5" />
                  </span>
                </div>
                <div className="mt-3.5">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, weightedPct))}%` }}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* Insight Banners */}
            {(totals.missingProbabilityCount > 0 || report.undated.dealCount > 0) && (
              <section className="space-y-2.5">
                {totals.missingProbabilityCount > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200/90 bg-amber-50/80 px-4 py-3 text-sm text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-200">
                    <div className="flex items-center gap-2.5">
                      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                      <span>
                        <strong className="font-semibold">
                          {totals.missingProbabilityCount} deal(s)
                        </strong>{" "}
                        have no probability. Their value is included in pipeline
                        value but excluded from weighted forecast.
                      </span>
                    </div>
                    <Link
                      href="/deals"
                      className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-950 dark:text-amber-300"
                    >
                      Review deals
                    </Link>
                  </div>
                )}

                {report.undated.dealCount > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200">
                    <div className="flex items-center gap-2.5">
                      <CalendarClock className="h-4 w-4 shrink-0 text-slate-500 dark:text-slate-400" />
                      <span>
                        Across all visible owners,{" "}
                        <strong className="font-semibold text-slate-900 dark:text-white">
                          {report.undated.dealCount} open deal(s)
                        </strong>{" "}
                        have no expected close date (
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(report.undated.amount, currency)}
                        </span>
                        ) and are outside the monthly forecast.
                      </span>
                    </div>
                    <Link
                      href="/deals"
                      className="text-xs font-semibold text-cyan-700 underline underline-offset-2 hover:text-cyan-800 dark:text-cyan-400"
                    >
                      Set close dates
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* Forecast Table */}
            <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs dark:border-slate-700/80 dark:bg-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700/80">
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Monthly forecast breakdown
                  </h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {rows.length} {rows.length === 1 ? "entry" : "entries"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200/80 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-400">
                      <th className="px-5 py-3.5">Close month</th>
                      <th className="px-5 py-3.5">Deal owner</th>
                      <th className="px-5 py-3.5 text-right">Deals</th>
                      <th className="px-5 py-3.5 text-right">Pipeline value</th>
                      <th className="px-5 py-3.5 text-right">
                        Weighted forecast
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {months.length ? (
                      months.flatMap(([month, entries]) =>
                        entries.map((row, index) => {
                          const rowRatio =
                            row.amount > 0
                              ? Math.round(
                                  (row.weightedAmount / row.amount) * 100
                                )
                              : 0;
                          return (
                            <tr
                              key={`${month}-${row.ownerId}`}
                              className="border-b border-slate-100 transition-colors last:border-b-0 hover:bg-slate-50/70 dark:border-slate-700/60 dark:hover:bg-slate-700/30"
                            >
                              <td className="px-5 py-4 font-medium text-slate-800 dark:text-slate-100">
                                {index === 0 ? (
                                  <span className="inline-flex items-center gap-2 rounded-lg bg-slate-100/80 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-700/70 dark:text-slate-200">
                                    {new Date(
                                      `${month}-01T00:00:00Z`
                                    ).toLocaleDateString(undefined, {
                                      month: "long",
                                      year: "numeric",
                                      timeZone: "UTC",
                                    })}
                                  </span>
                                ) : (
                                  ""
                                )}
                              </td>
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-2.5">
                                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-50 text-[11px] font-bold text-cyan-700 ring-1 ring-cyan-200/80 dark:bg-cyan-950/60 dark:text-cyan-300 dark:ring-cyan-800/70">
                                    {row.ownerId === "unassigned" ? (
                                      <UserRound className="h-3.5 w-3.5" />
                                    ) : (
                                      getInitials(row.ownerName)
                                    )}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                                      {row.ownerName}
                                    </p>
                                    {row.missingProbabilityCount > 0 && (
                                      <p className="text-[11px] text-amber-600 dark:text-amber-400">
                                        {row.missingProbabilityCount} without
                                        probability
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-5 py-4 text-right tabular-nums">
                                <span className="inline-flex min-w-7 items-center justify-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                                  {row.dealCount}
                                </span>
                              </td>
                              <td className="px-5 py-4 text-right font-medium tabular-nums text-slate-700 dark:text-slate-200">
                                {formatCurrency(row.amount, currency)}
                              </td>
                              <td className="px-5 py-4 text-right tabular-nums">
                                <div className="inline-flex flex-col items-end">
                                  <span className="font-semibold text-slate-900 dark:text-white">
                                    {formatCurrency(
                                      row.weightedAmount,
                                      currency
                                    )}
                                  </span>
                                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                                    {rowRatio}% weighted
                                  </span>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-5 py-12 text-center">
                          <div className="mx-auto flex max-w-xs flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                            <CalendarDays className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              No open deals in this date range
                            </p>
                            <p className="text-xs">
                              Try expanding the month range or assigning
                              expected close dates to open deals.
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {rows.length > 0 && (
                    <tfoot>
                      <tr className="border-t border-slate-200 bg-slate-50/90 font-semibold text-slate-900 dark:border-slate-700 dark:bg-slate-900/50 dark:text-white">
                        <td className="px-5 py-3.5" colSpan={2}>
                          Total
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {totals.dealCount}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {formatCurrency(totals.amount, currency)}
                        </td>
                        <td className="px-5 py-3.5 text-right tabular-nums">
                          {formatCurrency(totals.weightedAmount, currency)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
          </>
        )
      )}
    </main>
  );
}
