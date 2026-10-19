"use client";

import { useEffect, useState } from "react";
import { Hash, Lock, MessageCircle, Users, X, Loader2, Search } from "lucide-react";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { ChatUser, Conversation } from "@/src/types/chat";
import { useChat } from "./ChatProvider";

export default function ConversationDialog({ close, onSelect }: { close: () => void; onSelect: (id: string) => void }) {
  const { uid, refresh, capabilities } = useChat();
  const [kind, setKind] = useState<Conversation["kind"]>("dm");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [selected, setSelected] = useState<ChatUser[]>([]);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true);
      void chatApi.users(query).then(data => { if (!cancelled) setUsers(data.filter(u => u.id !== uid)); })
        .catch(err => { if (!cancelled) setError(chatError(err)); }).finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, uid]);
  useEffect(() => {
    const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !busy) close(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [close, busy]);
  const submit = async () => {
    setBusy(true); setError("");
    try {
      const conversation = await chatApi.create({ kind, name, description, visibility: kind === "channel" ? visibility : "private", memberIds: selected.map(u => u.id) });
      await refresh(); onSelect(conversation.id); close();
    } catch (err) { setError(chatError(err)); setBusy(false); }
  };
  return <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) close(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="new-conversation-title" className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-200 px-6 py-5 dark:border-slate-700"><div><h2 id="new-conversation-title" className="text-lg font-semibold">Bring your team together</h2><p className="mt-1 text-xs text-slate-400">Start a conversation in your company.</p></div><button disabled={busy} aria-label="Close dialog" onClick={close}><X size={20} /></button></header>
      <div className="overflow-y-auto p-6">
        <div className="mb-5 grid grid-cols-3 gap-2">{([["dm", "Direct message", MessageCircle], ["group", "Group", Users], ["channel", "Channel", Hash]] as const).map(([value, label, Icon]) => <button key={value} onClick={() => { setKind(value); setSelected([]); }} className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs ${kind === value ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" : "border-slate-200 text-slate-500 dark:border-slate-700"}`}><Icon size={20} />{label}</button>)}</div>
        {kind !== "dm" && <><label className="mb-4 block text-xs font-medium">Name<input autoFocus value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder={kind === "channel" ? "e.g. sales-team" : "e.g. Product launch"} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2.5 text-sm dark:border-slate-600" /></label>
          <label className="mb-4 block text-xs font-medium">Description <span className="text-slate-400">(optional)</span><input value={description} maxLength={500} onChange={e => setDescription(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-600" /></label></>}
        {kind === "channel" && <label className="mb-4 flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800"><span className="flex items-center gap-2">{visibility === "private" ? <Lock size={16} /> : <Hash size={16} />}Channel visibility</span><select value={visibility} onChange={e => setVisibility(e.target.value as "private" | "public")} className="rounded bg-transparent text-xs"><option value="private">Private</option><option value="public">Public within company</option></select></label>}
        <label className="block text-xs font-medium">{kind === "dm" ? "Choose a teammate" : "Add teammates"}</label>
        {selected.length > 0 && <div className="my-2 flex flex-wrap gap-1">{selected.map(u => <button key={u.id} onClick={() => setSelected(previous => previous.filter(p => p.id !== u.id))} className="flex items-center gap-1 rounded-full bg-cyan-50 px-2 py-1 text-xs text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{u.name}<X size={12} /></button>)}</div>}
        <div className="my-2 flex items-center gap-2 rounded-lg border border-slate-200 px-3 dark:border-slate-600"><Search size={15} className="text-slate-400" /><input aria-label="Search teammates" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name…" className="w-full bg-transparent py-2 text-sm outline-none" /></div>
        <div className="max-h-48 overflow-y-auto">{loading ? <Loader2 size={20} className="mx-auto my-4 animate-spin text-cyan-600" /> : users.length === 0 ? <p className="p-4 text-center text-sm text-slate-400">No teammates found.</p> : users.map(u => <label key={u.id} className="flex cursor-pointer items-center gap-3 rounded-lg p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800"><input type="checkbox" checked={selected.some(s => s.id === u.id)} onChange={e => setSelected(previous => e.target.checked ? kind === "dm" ? [u] : [...previous, u] : previous.filter(p => p.id !== u.id))} /><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-600 dark:bg-slate-700 dark:text-slate-200">{u.name[0]}</span><span className="text-sm">{u.name}</span></label>)}</div>
        {error && <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>}
      </div>
      <footer className="flex items-center justify-between border-t border-slate-200 px-6 py-4 dark:border-slate-700"><span className="text-xs text-slate-400">{selected.length} selected · max {(capabilities?.maxMembers || 100) - 1}</span><button disabled={busy || (kind === "dm" ? selected.length !== 1 : !name.trim())} onClick={() => void submit()} className="rounded-lg bg-cyan-700 px-5 py-2 text-sm font-medium text-white disabled:opacity-40">{busy ? "Creating…" : "Start conversation"}</button></footer>
    </section>
  </div>;
}
