"use client";

import { FormEvent, useState } from "react";
import api from "@/src/lib/axios";

export default function LeadInteractionLog({ leadId, onSaved }: { leadId: string; onSaved: () => void }) {
  const [channel, setChannel] = useState("call");
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const save = async (event: FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await api.post(`/next-action/lead/${leadId}/interaction`, { channel, summary: summary.trim() });
      setSummary(""); onSaved();
    } catch { setError("Could not log this interaction. Please try again."); }
    finally { setBusy(false); }
  };
  return <form onSubmit={save} className="mb-5 rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 dark:border-cyan-900 dark:bg-cyan-950/20">
    <h4 className="font-semibold">Log interaction</h4>
    <p className="mt-1 text-xs text-slate-500">Record a completed contact directly on this lead. It appears in the timeline.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
      <label className="text-sm">Channel<select value={channel} onChange={event => setChannel(event.target.value)} className="mt-1 block w-full rounded border p-2 dark:bg-slate-800">{["call", "email", "whatsapp", "linkedin", "meeting", "other"].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-sm">What happened?<input required minLength={2} maxLength={2000} value={summary} onChange={event => setSummary(event.target.value)} placeholder="e.g. Contact replied; discuss scope next week" className="mt-1 block w-full rounded border p-2 dark:bg-slate-800" /></label>
      <button disabled={busy || summary.trim().length < 2} className="rounded bg-cyan-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">Save interaction</button>
    </div>
    {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
  </form>;
}
