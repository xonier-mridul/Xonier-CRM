"use client";
import { useEffect, useState } from "react";
import { Check, Loader2, Search, X } from "lucide-react";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { ChatUser } from "@/src/types/chat";
import { useChat } from "./ChatProvider";
import { PersonAvatar } from "./ChatDialog";

export default function PeoplePicker({ selected, onChange, exclude = [], maximum, single = false }: {
  selected: ChatUser[]; onChange: (users: ChatUser[]) => void; exclude?: string[]; maximum: number; single?: boolean;
}) {
  const { uid, onlineIds } = useChat();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      setLoading(true); setError("");
      void chatApi.users(query.trim()).then(data => { if (!cancelled) setUsers(data); })
        .catch(cause => { if (!cancelled) setError(chatError(cause)); }).finally(() => { if (!cancelled) setLoading(false); });
    }, 200);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query]);
  const visible = users.filter(user => user.id !== uid && !exclude.includes(user.id));
  return <div>
    <div className="mb-3 flex items-center gap-2 rounded-xl border border-slate-300 px-3 focus-within:border-cyan-600 dark:border-slate-600"><Search size={16} className="text-slate-400" /><input aria-label="Search teammates" value={query} onChange={e => setQuery(e.target.value)} placeholder="Search teammates by name" className="w-full bg-transparent py-3 text-sm outline-none" /></div>
    {selected.length > 0 && <div className="mb-3 flex flex-wrap gap-1.5">{selected.map(user => <button key={user.id} aria-label={`Unselect ${user.name}`} onClick={() => onChange(selected.filter(item => item.id !== user.id))} className="flex items-center gap-1.5 rounded-full bg-cyan-50 py-1 pl-3 pr-2 text-xs font-medium text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{user.name}<X size={13} /></button>)}</div>}
    <div className="max-h-60 min-h-24 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700">
      {loading ? <div className="flex items-center justify-center gap-2 p-7 text-sm text-slate-400"><Loader2 size={17} className="animate-spin" />Finding teammates…</div> : error ? <p role="alert" className="p-4 text-sm text-red-600">{error}</p> : !visible.length ? <p className="p-6 text-center text-sm text-slate-500">{query ? "No matching teammates. Try another name." : "All available teammates are already members."}</p> : visible.map(user => {
        const checked = selected.some(item => item.id === user.id);
        return <button key={user.id} type="button" role="checkbox" aria-checked={checked} disabled={!checked && !single && selected.length >= maximum} onClick={() => onChange(checked ? selected.filter(item => item.id !== user.id) : single ? [user] : [...selected, user])} className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left last:border-0 disabled:opacity-40 dark:border-slate-800 ${checked ? "bg-cyan-50/70 dark:bg-cyan-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-800"}`}><PersonAvatar name={user.name} size="sm" online={onlineIds.includes(user.id) ? true : undefined} /><span className="min-w-0 flex-1 truncate text-sm font-medium">{user.name}</span><span className={`flex h-5 w-5 items-center justify-center rounded-md border ${checked ? "border-cyan-700 bg-cyan-700 text-white" : "border-slate-300 dark:border-slate-600"}`}>{checked && <Check size={13} />}</span></button>;
      })}
    </div><p className="mt-2 text-xs text-slate-400">{selected.length} selected{!single && ` · ${maximum} available places`}</p>
  </div>;
}
