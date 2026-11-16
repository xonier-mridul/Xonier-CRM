"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import dealService from "@/src/services/deal.service";

type Mode = "all" | "stalled" | "missing";
type Queue = {
  stallDays: number;
  totalPages: number;
  stages: { _id: string; total: number; stalled: number; missing: number }[];
  data: {
    id: string;
    dealName: string;
    dealStage: string;
    daysInStage: number;
    estimated: boolean;
    stalled: boolean;
    noNextAction: boolean;
    nextAction: { title: string; dueAt: string } | null;
  }[];
};

export default function DealAttentionQueue({ onBack, stageLabel }: {
  onBack: () => void;
  stageLabel: (key: string) => string;
}) {
  const [mode, setMode] = useState<Mode>("stalled");
  const [page, setPage] = useState(1);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<Queue | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError(false);
    dealService.getAll(page, 20, { attention: mode })
      .then(response => { if (active) setResult(response.data.data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [mode, page, refresh]);

  return (
    <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-gray-800">
      <button className="text-sm text-cyan-700 dark:text-cyan-300" onClick={onBack}>← Back to Deals</button>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Deal ageing</h1>
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={() => setRefresh(value => value + 1)}>Refresh</button>
      </div>
      {result && <p className="text-sm text-slate-500">Deals are flagged as stalled after {result.stallDays} days in the same stage. Older deals without stage history are estimated from their creation date.</p>}
      {!!result?.stages.length && <ul aria-label="Ageing by stage" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {result.stages.map(stage => <li key={stage._id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="font-medium">{stageLabel(stage._id)}</p>
          <p className="text-sm text-slate-500">{stage.total} open · {stage.stalled} stalled · {stage.missing} no next action</p>
        </li>)}
      </ul>}
      <div className="flex flex-wrap gap-2" aria-label="Deal queue filter">
        {([["stalled", "Stalled"], ["missing", "No next action"], ["all", "All open deals"]] as const).map(([value, label]) => (
          <button key={value} aria-pressed={mode === value} onClick={() => { setMode(value); setPage(1); }}
            className={`rounded-lg px-3 py-2 text-sm ${mode === value ? "bg-cyan-700 text-white" : "border border-slate-300 dark:border-slate-600"}`}>
            {label}
          </button>
        ))}
      </div>
      {error ? <p role="alert" className="text-sm text-red-600">Could not load the queue. Try Refresh.</p>
        : !result ? <p role="status" className="text-sm text-slate-500">Loading deals…</p>
        : !result.data.length ? <p className="text-sm text-slate-500">No deals on this page.</p>
        : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
          <thead><tr className="border-b dark:border-slate-700"><th className="p-3">Deal</th><th className="p-3">Stage</th><th className="p-3">Days in stage</th><th className="p-3">Next action</th></tr></thead>
          <tbody>{result.data.map(deal => <tr key={deal.id} className="border-b dark:border-slate-700">
            <td className="p-3"><Link href={`/deals/view/${deal.id}`} className="font-medium text-cyan-700 hover:underline dark:text-cyan-300">{deal.dealName}</Link></td>
            <td className="p-3">{stageLabel(deal.dealStage)}</td>
            <td className="p-3">{deal.estimated ? "≈ " : ""}{deal.daysInStage}{deal.stalled && <span className="ml-2 rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">Stalled</span>}</td>
            <td className="p-3">{deal.nextAction
              ? <><span>{deal.nextAction.title}</span><p className="text-xs text-slate-500">{new Date(deal.nextAction.dueAt).toLocaleString()}{Date.parse(deal.nextAction.dueAt) < Date.now() ? " · Overdue" : ""}</p></>
              : <span className="rounded bg-rose-100 px-2 py-1 text-xs font-medium text-rose-900">No next action</span>}</td>
          </tr>)}</tbody>
        </table></div>}
      {result && (result.totalPages > 1 || page > 1) && <div className="flex items-center justify-between text-sm">
        <button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded border px-3 py-2 disabled:opacity-40">Previous</button>
        <span>Page {page}</span>
        <button disabled={page >= result.totalPages} onClick={() => setPage(page + 1)} className="rounded border px-3 py-2 disabled:opacity-40">Next</button>
      </div>}
    </section>
  );
}
