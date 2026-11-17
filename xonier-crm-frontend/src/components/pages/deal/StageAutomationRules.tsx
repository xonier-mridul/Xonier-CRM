"use client";

import { FormEvent, useEffect, useState } from "react";
import api from "@/src/lib/axios";
import { useDealStages } from "@/src/hooks/useLeadStatuses";
import { toast } from "react-toastify";

type Kind = "call" | "email" | "meeting" | "task" | "whatsapp" | "other";
type Rule = { id: string; stageKey: string; kind: Kind; title: string; delayDays: number; enabled: boolean };
const blank: Omit<Rule, "id"> = { stageKey: "", kind: "task", title: "", delayDays: 1, enabled: true };

export default function StageAutomationRules() {
  const { statuses } = useDealStages();
  const [rules, setRules] = useState<Rule[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = async () => {
    try { setRules((await api.get("/stage-automation/rules")).data.data); }
    catch { toast.error("Could not load stage automation rules"); }
  };
  useEffect(() => { void load(); }, []);
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true);
    try {
      if (editing) await api.put(`/stage-automation/rules/${editing}`, form);
      else await api.post("/stage-automation/rules", form);
      setEditing(null); setForm(blank); await load(); toast.success("Automation rule saved");
    } catch { toast.error("Could not save automation rule"); }
    finally { setBusy(false); }
  };
  const remove = async (id: string) => {
    if (!window.confirm("Delete this automation rule?")) return;
    setBusy(true);
    try { await api.delete(`/stage-automation/rules/${id}`); await load(); toast.success("Automation rule deleted"); }
    catch { toast.error("Could not delete automation rule"); }
    finally { setBusy(false); }
  };
  return <section className="mt-8 rounded-xl border border-slate-200 p-5 dark:border-slate-600">
    <h2 className="text-lg font-semibold">Stage-change automation</h2>
    <p className="mt-1 text-sm text-slate-500">Create a next action for the deal owner when a deal enters a stage.</p>
    <form onSubmit={save} className="mt-4 grid gap-3 md:grid-cols-5">
      <label className="text-sm">Stage<select required value={form.stageKey} onChange={e => setForm({ ...form, stageKey: e.target.value })} className="mt-1 w-full rounded border p-2 dark:bg-slate-800"><option value="">Select stage</option>{statuses.map(s => <option key={s.key} value={s.key}>{s.name}</option>)}</select></label>
      <label className="text-sm">Activity<select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value as Kind })} className="mt-1 w-full rounded border p-2 dark:bg-slate-800">{(["call", "email", "meeting", "task", "whatsapp", "other"] as Kind[]).map(k => <option key={k} value={k}>{k}</option>)}</select></label>
      <label className="text-sm md:col-span-2">Title<input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="mt-1 w-full rounded border p-2 dark:bg-slate-800" /></label>
      <label className="text-sm">Due after days<input required type="number" min={1} max={365} value={form.delayDays} onChange={e => setForm({ ...form, delayDays: Number(e.target.value) })} className="mt-1 w-full rounded border p-2 dark:bg-slate-800" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.enabled} onChange={e => setForm({ ...form, enabled: e.target.checked })} />Enabled</label>
      <div className="flex gap-2"><button disabled={busy} className="rounded bg-cyan-600 px-4 py-2 text-sm text-white disabled:opacity-50">{editing ? "Save changes" : "Add rule"}</button>{editing && <button type="button" onClick={() => { setEditing(null); setForm(blank); }} className="rounded border px-3 py-2 text-sm">Cancel</button>}</div>
    </form>
    <div className="mt-5 space-y-2">{rules.map(rule => <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3 text-sm dark:border-slate-600"><span>{statuses.find(s => s.key === rule.stageKey)?.name || rule.stageKey} → {rule.kind}: {rule.title} · due in {rule.delayDays} day{rule.delayDays === 1 ? "" : "s"}{!rule.enabled && " · Disabled"}</span><span className="flex gap-3"><button disabled={busy} onClick={() => { setEditing(rule.id); setForm({ stageKey: rule.stageKey, kind: rule.kind, title: rule.title, delayDays: rule.delayDays, enabled: rule.enabled }); }} className="text-cyan-600">Edit</button><button disabled={busy} onClick={() => void remove(rule.id)} className="text-red-600">Delete</button></span></div>)}{rules.length === 0 && <p className="text-sm text-slate-500">No automation rules yet.</p>}</div>
  </section>;
}
