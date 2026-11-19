"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import { useDealStages, useLeadStatuses } from "@/src/hooks/useLeadStatuses";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import { useCompanyCurrency } from "@/src/components/providers/CompanyCurrencyProvider";
import { formatCurrency } from "@/src/app/utils/currency.utils";
import dealService from "@/src/services/deal.service";
import LeadService from "@/src/services/lead.service";
import { Lead } from "@/src/types/leads/leads.types";
import { Deal } from "@/src/types/deals/deal.types";
import { ArrowUpRight, BriefcaseBusiness, CircleDollarSign, ClipboardList, Search, CalendarDays, UserRound, AlertCircle } from "lucide-react";

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

function PreSalesPipeline() {
  const { statuses, loading: stagesLoading, error: stagesError, refresh } = useLeadStatuses();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const load = useCallback(async () => {
    setState("loading");
    try {
      const all = await fetchAllPages<Lead>(async page => {
        const res = (await LeadService.getAll(page, 100, { pipeline: "active" })).data.data;
        return { data: res.data, totalPages: res.totalPages };
      });
      setLeads(all);
      setState("ready");
    } catch {
      setState("error");
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (state === "loading" || stagesLoading) return <p className="p-6 text-sm text-slate-500">Loading leads…</p>;
  if (state === "error" || stagesError) return <p role="alert" className="p-6 text-sm">{stagesError || "Unable to load leads."} <button onClick={() => { void load(); void refresh(); }} className="underline">Retry</button></p>;

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

export default function SalesPipeline() {
  const [view, setView] = useState<"leads" | "deals">("leads");
  return <div>
    <nav aria-label="Pipeline views" className="flex flex-wrap gap-2 px-3 pt-4 sm:px-5 lg:px-6">
      {([{ key: "leads", label: "Pre-sales · Leads" }, { key: "deals", label: "Sales · Deals" }] as const).map(option =>
        <button key={option.key} type="button" aria-pressed={view === option.key}
          onClick={() => setView(option.key)}
          className={`rounded-lg border px-4 py-2 text-sm font-medium ${view === option.key ? "border-cyan-300 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" : "border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"}`}>
          {option.label}
        </button>)}
    </nav>
    {view === "leads" ? <div className="p-3 sm:p-5 lg:p-6"><PreSalesPipeline /></div> : <DealPipeline />}
  </div>;
}

function DealPipeline() {
  const { statuses, loading: stagesLoading, error: stagesError, refresh } = useDealStages();
  const { hasPermission } = usePermissions();
  const currency = useCompanyCurrency();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [moving, setMoving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const all = await fetchAllPages<Deal>(async page => {
        const res = (await dealService.getAll(page, 100, { pipeline_open: "true" })).data.data;
        return { data: res.data, totalPages: res.totalPages };
      });
      setDeals(all);
    } catch { setError("Unable to load deals. Please try again."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
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
  const weightedForStage = (items: Deal[], stageProbability?: number | null) =>
    items.reduce((sum, deal) => {
      const probability = deal.forecastProbability ?? deal.dealProbability ?? stageProbability;
      return probability == null ? sum : sum + (Number(deal.amount) || 0) * Math.max(0, Math.min(100, probability)) / 100;
    }, 0);
  const negotiationStage = stages.find(stage => stage.name === "Negotiation");
  const negotiating = visible.filter(deal => deal.dealStage === negotiationStage?.key);
  const weighted = weightedForStage(negotiating, negotiationStage?.probability);
  const missingProbability = negotiating.filter(deal => (deal.forecastProbability ?? deal.dealProbability ?? negotiationStage?.probability) == null).length;
  const move = async ({ source, destination, draggableId }: DropResult) => {
    if (!destination || source.droppableId === destination.droppableId || !hasPermission(PERMISSIONS.updateDeal) || moving) return;
    setMoving(true); setError("");
    try { await dealService.updateStage(draggableId, destination.droppableId); await load(); }
    catch { setError("Could not move the deal. Check required fields and try again."); }
    finally { setMoving(false); }
  };
  return <div className="p-3 sm:p-5 lg:p-6">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-800 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-cyan-600"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500"/>Sales workspace</div><h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Sales pipeline</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">A clear view of your open opportunities and their next steps.</p></div><Link href="/deals" className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-cyan-300 hover:text-cyan-700 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200">Manage deals <ArrowUpRight size={16}/></Link></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-3">{[
      { label: "Open deals", value: visible.length, detail: "Active opportunities", Icon: BriefcaseBusiness, color: "bg-cyan-100 text-cyan-700", box: "border-cyan-100 bg-cyan-50/60 dark:bg-cyan-950/20" },
      { label: "Pipeline value", value: amount(visible), detail: "Total open deal value", Icon: CircleDollarSign, color: "bg-blue-100 text-blue-700", box: "border-blue-100 bg-blue-50/50 dark:bg-blue-950/20" },
      { label: "Needs a next step", value: visible.filter(d => !d.nextStep && !d.followUpAt).length, detail: "No next step or follow-up", Icon: ClipboardList, color: "bg-amber-100 text-amber-700", box: "border-amber-100 bg-amber-50/50 dark:bg-amber-950/20" },
    ].map(({ label, value, detail, Icon, color, box }) => <div key={label} className={`flex items-center gap-4 rounded-xl border p-4 ${box}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color}`}><Icon size={21}/></span><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p><p className="mt-1 truncate text-xl font-bold text-slate-900 dark:text-white">{value}</p><p className="mt-0.5 text-xs text-slate-500">{detail}</p></div></div>)}</div>
    <div className="mt-7 flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-700"><div><h2 className="text-base font-bold text-slate-800 dark:text-white">Deal stages</h2><p className="mt-1 text-xs text-slate-500">Move cards between stages to update your pipeline.</p></div><div className="relative w-full sm:w-72"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/><input aria-label="Search pipeline" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search deals or contacts" className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-700 outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 dark:border-slate-600 dark:bg-slate-900 dark:text-white"/></div></div>
    {(error || stagesError) && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error || stagesError} <button className="underline" onClick={() => { void load(); void refresh(); }}>Retry</button></div>}
    {!loading && !stagesLoading && !stagesError && <div className="mt-4 space-y-1 text-sm text-slate-600 dark:text-slate-300">
      {stages.length < 3 && <p>Stage setup needed: {["Scoping", "Proposal", "Negotiation"].filter(name => !stages.some(stage => stage.name === name)).join(", ")}.</p>}
      {negotiating.length > 0 && <p>Negotiation weighted value: {missingProbability === negotiating.length ? "Probability not recorded" : formatCurrency(weighted, currency)}{missingProbability > 0 && missingProbability < negotiating.length ? ` · ${missingProbability} without probability` : ""}</p>}
    </div>}
    {loading || stagesLoading ? <p className="py-12 text-center text-sm text-slate-500">Loading pipeline…</p> : <DragDropContext onDragEnd={move}><div className="mt-5 flex gap-4 max-h-[min(650px,65dvh)] overflow-auto overscroll-contain pb-4">{stages.map(stage => { const items = visible.filter(d => d.dealStage === stage.key); const stageWeighted = weightedForStage(items, stage.probability); return <section key={stage.key} className="w-[280px] shrink-0 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/50"><div className="sticky top-0 z-10 rounded-t-xl border-b border-slate-200 bg-white px-4 py-4 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-center justify-between gap-2"><div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }}/><span className="truncate text-sm font-bold text-slate-800 dark:text-slate-100">{stage.name}</span>{stage.probability != null && <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-slate-600 dark:bg-slate-700 dark:text-slate-300">{stage.probability}%</span>}</div><span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{items.length}</span></div><p className="mt-2 pl-[18px] text-xs font-medium text-slate-500">{amount(items)} <span className="text-slate-400">· total</span></p><p className="mt-0.5 pl-[18px] text-xs font-semibold text-cyan-700 dark:text-cyan-400">{formatCurrency(stageWeighted, currency)} <span className="font-normal text-slate-400">· weighted</span></p></div><Droppable droppableId={stage.key}>{(provided, snapshot) => <div ref={provided.innerRef} {...provided.droppableProps} className={`min-h-36 space-y-2.5 p-2.5 transition-colors ${snapshot.isDraggingOver ? "bg-cyan-50 dark:bg-cyan-950/30" : ""}`}>{items.map((deal, index) => <Draggable key={deal.id} draggableId={deal.id} index={index} disableInteractiveElementBlocking isDragDisabled={!hasPermission(PERMISSIONS.updateDeal) || moving}>{(p, state) => <article ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={`rounded-lg border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-800 ${state.isDragging ? "shadow-xl ring-2 ring-cyan-400" : "shadow-sm hover:shadow-md"}`}><div className="flex items-start justify-between gap-2"><Link href={`/deals/view/${deal.id}`} className="min-w-0 text-sm font-semibold leading-5 text-slate-800 hover:text-cyan-700 dark:text-slate-100">{deal.dealName || "Unnamed deal"}</Link></div><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500"><UserRound size={13} className="shrink-0 text-slate-400"/><span className="truncate">{[deal.organization?.name, deal.person?.fullName].filter(Boolean).join(" · ") || "No linked contact"}</span></p><p className="mt-4 text-base font-bold text-slate-900 dark:text-white">{deal.amount != null ? formatCurrency(Number(deal.amount), currency) : "Value not set"}</p><div className="mt-3 space-y-2 border-t border-slate-100 pt-3 dark:border-slate-700"><p className={`flex items-start gap-1.5 text-xs ${deal.nextStep ? "text-slate-600 dark:text-slate-300" : "text-amber-700 dark:text-amber-400"}`}><AlertCircle size={13} className="mt-0.5 shrink-0"/><span>{deal.nextStep ? `Next: ${deal.nextStep}` : "No next step recorded"}</span></p>{deal.followUpAt && <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>Follow-up: {new Date(deal.followUpAt).toLocaleDateString()}</p>}{deal.closeDate && <p className="flex items-center gap-1.5 text-xs text-slate-500"><CalendarDays size={13}/>Close: {new Date(deal.closeDate).toLocaleDateString()}</p>}</div></article>}</Draggable>)}{provided.placeholder}{items.length === 0 && <p className="px-3 py-8 text-center text-xs text-slate-400">No deals in this stage</p>}</div>}</Droppable></section> })}</div></DragDropContext>}
    {!loading && !stagesLoading && unassigned.length > 0 && <details className="rounded-lg border border-slate-200 p-4 text-sm dark:border-slate-700">
      <summary className="cursor-pointer">Deals in other stages ({unassigned.length})</summary>
      <ul className="mt-3 space-y-2">{unassigned.map(deal => <li key={deal.id}>
        <Link className="text-cyan-700 underline dark:text-cyan-300" href={`/deals/view/${deal.id}`}>{deal.dealName || "Unnamed deal"}</Link>
        <span className="ml-2 text-slate-500">{statuses.find(stage => stage.key === deal.dealStage)?.name || deal.dealStage}</span>
      </li>)}</ul>
    </details>}
  </div></div>;
}
