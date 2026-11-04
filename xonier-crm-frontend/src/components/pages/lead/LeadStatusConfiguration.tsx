"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import { useLeadStatuses } from "@/src/hooks/useLeadStatuses";
import { LeadStatus, LeadStatusInput, LeadStatusService, notifyLeadStatusesChanged } from "@/src/services/leadStatus.service";
import { toast } from "react-toastify";
import { ArrowLeft, Plus, Pencil, Trash2, Layers, ArrowRight, Check, CheckCircle2, CircleDashed, Search, X, LockKeyhole, ArrowUpRight, Flag, Loader2 } from "lucide-react";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

const empty: LeadStatusInput = { name: "", type: "ongoing", color: "#0891b2", order: 0 };
const colors = ["#64748b", "#0891b2", "#2563eb", "#4f46e5", "#9333ea", "#d97706", "#059669", "#e11d48"];
const inputClass = "mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/10 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100";

function TypeBadge({ type }: { type: LeadStatus["type"] }) {
  return type === "final" ? (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/10 dark:bg-emerald-500/10 dark:text-emerald-400"><CheckCircle2 size={12} />Final</span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300"><CircleDashed size={12} />Ongoing</span>
  );
}

export default function LeadStatusConfiguration({ onBack }: { onBack: () => void }) {
  const { statuses, loading, error, refresh } = useLeadStatuses();
  const roles = useSelector((s: RootState) => s.auth.user?.userRole || []);
  const canManage = roles.some(r => ["COMPANY_ADMIN", "SUPER_ADMIN", "ADMIN"].includes(r.code));
  const [editing, setEditing] = useState<LeadStatus | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<LeadStatusInput>(empty);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "ongoing" | "final">("all");
  const modalRef = useRef<HTMLFormElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const ongoing = statuses.filter(s => s.type === "ongoing");
  const final = statuses.find(s => s.type === "final");
  const totalLeads = statuses.reduce((sum, s) => sum + (s.leadCount ?? 0), 0);
  const preview = useMemo(() => [...statuses].sort((a, b) => Number(a.type === "final") - Number(b.type === "final") || a.order - b.order), [statuses]);
  const filtered = statuses.filter(s => (typeFilter === "all" || s.type === typeFilter) && s.name.toLowerCase().includes(search.trim().toLowerCase()));
  const anotherFinal = statuses.some(s => s.type === "final" && s.key !== editing?.key);

  const closeModal = () => { if (!saving) { setOpen(false); openerRef.current?.focus(); } };
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) { setOpen(false); openerRef.current?.focus(); }
      if (event.key === "Tab") {
        const nodes = modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), [tabindex="0"]');
        if (!nodes?.length) return;
        const first = nodes[0], last = nodes[nodes.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", onKey); };
  }, [open, saving]);

  const changed = async () => {
    notifyLeadStatusesChanged();
    if (typeof BroadcastChannel !== "undefined") { const c = new BroadcastChannel("lead-statuses"); c.postMessage("changed"); c.close(); }
    await refresh();
  };
  const message = (e: unknown) => (e as { response?: { data?: { message?: string } } }).response?.data?.message || "Unable to save lead status. Please retry.";
  const showModal = (stage?: LeadStatus) => {
    openerRef.current = document.activeElement as HTMLElement;
    setEditing(stage || null);
    setForm(stage ? { name: stage.name, type: stage.type, color: stage.color, order: stage.order } : { ...empty, order: Math.max(0, ...statuses.map(s => s.order)) + 1 });
    setFormError(""); setOpen(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); setFormError("");
    try {
      if (editing) await LeadStatusService.update(editing.key, form); else await LeadStatusService.create(form);
      setOpen(false); openerRef.current?.focus(); await changed(); toast.success(editing ? "Lead status updated" : "Lead status created");
    } catch (e) { setFormError(message(e)); } finally { setSaving(false); }
  };
  const remove = async (stage: LeadStatus) => {
    const result = await ConfirmPopup({ title: "Delete lead status?", text: `Delete “${stage.name}”? Statuses used by leads cannot be deleted.`, btnTxt: "Delete status" });
    if (!result.isConfirmed) return;
    setSaving(true);
    try { await LeadStatusService.delete(stage.key); await changed(); toast.success("Lead status deleted"); }
    catch (e) { toast.error(message(e)); } finally { setSaving(false); }
  };

  if (!canManage) return <p className="p-8 text-sm text-slate-500">Only company admins can manage lead statuses.</p>;
  return (
    <div className="w-full rounded-xl border border-slate-900/10 bg-white p-6 dark:bg-gray-700 dark:backdrop-blur-sm">
      <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] font-medium text-slate-400"><button onClick={onBack} className="inline-flex items-center gap-1.5 transition hover:text-cyan-600"><ArrowLeft size={12} />Back to leads</button><span>/</span><span className="text-slate-600 dark:text-slate-300">Pipeline settings</span></div>
          <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-100 bg-cyan-50 text-cyan-600 dark:border-cyan-800 dark:bg-cyan-950/40"><Layers size={20} strokeWidth={1.7} /></span><h1 className="text-[23px] font-semibold tracking-tight text-slate-900 dark:text-white">Lead configuration</h1></div>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">Shape your sales workflow with stages that work for your team.</p>
        </div>
        <button disabled={loading || !!error || saving} onClick={() => showModal()} className="mt-7 inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-[13px] font-medium text-white shadow-sm transition hover:bg-cyan-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 disabled:opacity-50"><Plus size={16} />Create status</button>
      </div>

      {error && <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error} <button onClick={refresh} className="ml-2 underline">Retry</button></div>}

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {[
          { label: "Total statuses", value: statuses.length, detail: "Configured for your company", icon: Layers, color: "text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10" },
          { label: "Ongoing stages", value: ongoing.length, detail: "Keep leads moving forward", icon: CircleDashed, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-500/10" },
          { label: "Final status", value: final ? "01" : "00", detail: final?.name || "No final status configured", icon: Flag, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10" },
        ].map(card => <div key={card.label} className="flex items-center gap-3.5 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.color}`}><card.icon size={19} strokeWidth={1.7} /></span><div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{card.label}</p><p className="mt-0.5 text-xl font-semibold tracking-tight text-slate-800 dark:text-white">{loading ? "—" : typeof card.value === "number" ? String(card.value).padStart(2, "0") : card.value}</p><p className="mt-0.5 truncate text-[10px] text-slate-400">{card.detail}</p></div></div>)}
      </div>

      <div className="mb-5 rounded-xl border border-slate-200/80 bg-white px-5 py-4 dark:border-slate-700 dark:bg-slate-800">
        <div className="mb-3 flex items-center justify-between gap-3"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">Pipeline preview</p><span className="text-[10px] text-slate-400">Final stage appears last</span></div>
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {loading ? <div className="h-8 w-full animate-pulse rounded-md bg-slate-50 dark:bg-slate-700" /> : preview.map((stage, index) => <div key={stage.key} className="flex shrink-0 items-center gap-2">{index > 0 && <ArrowRight size={12} className="text-slate-300 dark:text-slate-600" />}<span className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[11px] font-medium" style={{ color: stage.color, borderColor: `${stage.color}25`, backgroundColor: `${stage.color}08` }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: stage.color }} />{stage.name}{stage.type === "final" && <Check size={11} />}</span></div>)}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-700">
          <div className="flex items-center gap-2.5"><h2 className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">Status library</h2><span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-700 dark:text-slate-300">{statuses.length}</span></div>
          <div className="flex flex-wrap items-center gap-3"><div className="flex items-center rounded-lg bg-slate-100/80 p-0.5 dark:bg-slate-900">{(["all", "ongoing", "final"] as const).map(type => <button key={type} onClick={() => setTypeFilter(type)} className={`rounded-md px-3 py-1.5 text-[11px] font-medium capitalize transition ${typeFilter === type ? "bg-white text-slate-800 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"}`}>{type === "all" ? "All statuses" : type}</button>)}</div><div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600"><Search size={14} className="text-slate-400" /><input aria-label="Search statuses" placeholder="Search statuses…" value={search} onChange={e => setSearch(e.target.value)} className="w-32 bg-transparent text-[11px] text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200 sm:w-36" />{search && <button aria-label="Clear search" onClick={() => setSearch("")}><X size={12} className="text-slate-400" /></button>}</div></div>
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[620px] text-left"><thead><tr className="bg-slate-50/70 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:bg-slate-900/40"><th className="w-[32%] px-5 py-3 font-medium">Status name</th><th className="w-[20%] px-5 py-3 font-medium">Status type</th><th className="w-[15%] px-5 py-3 font-medium">Position</th><th className="w-[23%] px-5 py-3 font-medium">Linked leads</th><th className="px-5 py-3 text-right font-medium">Actions</th></tr></thead><tbody>
          {loading ? Array.from({ length: 6 }).map((_, i) => <tr key={i} className="border-t border-slate-100 dark:border-slate-700">{Array.from({ length: 5 }).map((_, j) => <td key={j} className="px-5 py-5"><div className="h-4 w-3/4 animate-pulse rounded bg-slate-100 dark:bg-slate-700" /></td>)}</tr>) : filtered.length ? filtered.map(stage => {
            const count = stage.leadCount ?? 0;
            const share = totalLeads ? count / totalLeads * 100 : 0;
            return <tr key={stage.key} className="group border-t border-slate-100 transition-colors hover:bg-slate-50/60 dark:border-slate-700/60 dark:hover:bg-slate-700/20"><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="flex h-8 w-8 items-center justify-center rounded-lg border" style={{ borderColor: `${stage.color}20`, backgroundColor: `${stage.color}0c` }}><span className="h-2.5 w-2.5 rounded-full" style={{ background: stage.color }} /></span><span className="max-w-52 truncate text-[12px] font-medium text-slate-800 dark:text-slate-100" title={stage.name}>{stage.name}</span></div></td><td className="px-5 py-4"><TypeBadge type={stage.type} /></td><td className="px-5 py-4">{stage.type === "final" ? <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400"><Flag size={12} />Last</span> : <span className="font-mono text-[11px] text-slate-400">{String(stage.order + 1).padStart(2, "0")}</span>}</td><td className="px-5 py-4"><div className="flex max-w-36 items-center gap-3"><span className="min-w-7 text-[12px] font-medium tabular-nums text-slate-600 dark:text-slate-300">{count.toLocaleString()}</span><div aria-hidden="true" className="h-1 w-16 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700"><div className="h-full rounded-full" style={{ width: `${share}%`, background: stage.color, opacity: 0.65 }} /></div></div></td><td className="px-5 py-4"><div className="flex justify-end gap-1.5"><button aria-label={`Edit ${stage.name}`} title="Edit status" disabled={saving} onClick={() => showModal(stage)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-cyan-100 hover:bg-cyan-50 hover:text-cyan-600 dark:hover:border-cyan-800 dark:hover:bg-cyan-950/40"><Pencil size={14} /></button><button aria-label={`Delete ${stage.name}`} title={count ? "In use — move linked leads before deleting" : "Delete status"} disabled={saving || !!count} onClick={() => remove(stage)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent text-slate-400 transition hover:border-red-100 hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:border-red-900 dark:hover:bg-red-950/40"><Trash2 size={14} /></button></div></td></tr>;
          }) : <tr><td colSpan={5} className="px-5 py-12 text-center"><Search size={24} className="mx-auto mb-3 text-slate-300" /><p className="text-sm font-medium text-slate-600 dark:text-slate-300">No matching statuses</p><p className="mt-1 text-xs text-slate-400">Try a different name or status type.</p><button onClick={() => { setSearch(""); setTypeFilter("all"); }} className="mt-3 text-xs font-medium text-cyan-600">Clear filters</button></td></tr>}
        </tbody></table></div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/40 px-5 py-3 text-[10px] text-slate-400 dark:border-slate-700 dark:bg-slate-900/20"><span>Showing {filtered.length} of {statuses.length} statuses</span><button onClick={onBack} className="inline-flex items-center gap-1.5 font-medium text-cyan-600 hover:text-cyan-700">View leads<ArrowUpRight size={12} /></button></div>
      </div>
      <div className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-slate-400"><LockKeyhole size={13} className="mt-0.5 shrink-0" /><p>Statuses with linked leads are protected from deletion. Move those leads first, including any deleted records. Keep at least one ongoing stage.</p></div>

      {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/35 p-4 backdrop-blur-[3px]" onClick={event => { if (event.target === event.currentTarget) closeModal(); }}>
        <form ref={modalRef} onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="lead-status-modal-title" className="my-auto w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-700"><div><div className="mb-2 text-[10px] font-medium uppercase tracking-wider text-cyan-600">Pipeline settings</div><h2 id="lead-status-modal-title" className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white">{editing ? "Edit status" : "Create a lead status"}</h2><p className="mt-1 text-xs text-slate-400">Give this stage a name and a place in your workflow.</p></div><button type="button" aria-label="Close dialog" disabled={saving} onClick={closeModal} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X size={17} /></button></div>
          <div className="space-y-5 px-6 py-5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Status name <span className="text-red-400">*</span><input autoFocus required maxLength={60} placeholder="e.g. Negotiation" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className={inputClass} /></label>
            <fieldset><legend className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-300">Status type</legend><div className="grid grid-cols-2 gap-3">{(["ongoing", "final"] as const).map(type => <label key={type} className={`relative flex cursor-pointer gap-2.5 rounded-xl border p-3 transition ${form.type === type ? "border-cyan-500 bg-cyan-50/50 ring-1 ring-cyan-500/10 dark:bg-cyan-950/30" : "border-slate-200 hover:border-slate-300 dark:border-slate-600"}`}><input type="radio" name="statusType" value={type} checked={form.type === type} onChange={() => setForm({ ...form, type })} className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-cyan-600" /><span><span className="block text-xs font-medium capitalize text-slate-700 dark:text-slate-100">{type}</span><span className="mt-1 block text-[10px] leading-relaxed text-slate-400">{type === "ongoing" ? "Lead is actively progressing" : "Marks the lead as closed & converts to deal"}</span></span></label>)}</div>{anotherFinal && form.type === "final" && <p className="mt-2 text-[10px] leading-relaxed text-amber-600 dark:text-amber-400">{final?.name} is currently set as Final and will automatically switch to Ongoing when you save.</p>}</fieldset>
            <div className="flex flex-wrap justify-between gap-5"><fieldset><legend className="mb-2.5 text-xs font-medium text-slate-600 dark:text-slate-300">Stage color</legend><div className="flex flex-wrap items-center gap-2">{colors.map(color => <button key={color} type="button" aria-label={`Use color ${color}`} aria-pressed={form.color === color} onClick={() => setForm({ ...form, color })} style={{ background: color }} className={`flex h-6 w-6 items-center justify-center rounded-full ring-offset-2 ring-offset-white dark:ring-offset-slate-800 ${form.color === color ? "ring-2 ring-slate-300 dark:ring-slate-500" : ""}`}>{form.color === color && <Check size={12} className="text-white" />}</button>)}<label title="Custom color" className="ml-1"><span className="sr-only">Custom color</span><input type="color" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="h-7 w-7 cursor-pointer rounded border border-slate-200 bg-white p-0.5 dark:border-slate-600 dark:bg-slate-800" /></label></div></fieldset><label className="block text-xs font-medium text-slate-600 dark:text-slate-300">Display position<input type="number" min={1} max={10001} required disabled={form.type === "final"} value={form.order + 1} onChange={e => setForm({ ...form, order: Math.max(0, Number(e.target.value) - 1) })} className={`${inputClass} !mt-2 !w-24 disabled:opacity-40`} />{form.type === "final" && <span className="mt-1 block text-[10px] text-slate-400">Always last</span>}</label></div>
            <div className="flex items-center justify-between rounded-lg border border-dashed border-slate-200 bg-slate-50/60 px-3.5 py-3 dark:border-slate-600 dark:bg-slate-900/30"><span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Preview</span><span className="inline-flex max-w-[65%] items-center gap-2 truncate rounded-md px-2.5 py-1 text-xs font-medium" style={{ color: form.color, background: `${form.color}12` }}><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: form.color }} /><span className="truncate">{form.name.trim() || "Status name"}</span>{form.type === "final" && <CheckCircle2 size={12} className="shrink-0" />}</span></div>
            {formError && <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600 dark:border-red-900 dark:bg-red-950/30">{formError}</p>}
          </div>
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/50 px-6 py-4 dark:border-slate-700 dark:bg-slate-900/20"><button type="button" disabled={saving} onClick={closeModal} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">Cancel</button><button disabled={saving || !form.name.trim()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-cyan-700 disabled:opacity-50">{saving && <Loader2 size={13} className="animate-spin" />}{saving ? "Saving…" : editing ? "Save changes" : "Create status"}</button></div>
        </form>
      </div>}
    </div>
  );
}
