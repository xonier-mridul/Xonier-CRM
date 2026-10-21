"use client";
import { useState } from "react";
import { Hash, Lock, MessageCircle, Users, Loader2 } from "lucide-react";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { ChatUser, Conversation } from "@/src/types/chat";
import { useChat } from "./ChatProvider";
import ChatDialog from "./ChatDialog";
import PeoplePicker from "./PeoplePicker";

export default function ConversationDialog({ close, onSelect, initialKind = "dm" }: { close: () => void; onSelect: (id: string) => void; initialKind?: Conversation["kind"] }) {
  const { refresh, capabilities } = useChat();
  const [kind, setKind] = useState(initialKind);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [selected, setSelected] = useState<ChatUser[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const maximum = (capabilities?.maxMembers || 100) - 1;
  const submit = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const conversation = await chatApi.create({ kind, name: name.trim(), description: description.trim(), visibility: kind === "channel" ? visibility : "private", memberIds: selected.map(user => user.id) });
      await refresh(); onSelect(conversation.id); close();
    } catch (cause) { setError(chatError(cause)); setBusy(false); }
  };
  return <ChatDialog close={close} busy={busy} title="Start a conversation" subtitle="The right people. A shared space. Everything in one place.">
    <div className="overflow-y-auto p-6">
      <div className="mb-6 grid grid-cols-3 gap-2">{([["dm", "Message", MessageCircle], ["group", "Group", Users], ["channel", "Channel", Hash]] as const).map(([value, label, Icon]) => <button disabled={busy} key={value} onClick={() => { setKind(value); setSelected([]); setError(""); }} className={"flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition " + (kind === value ? "border-cyan-600 bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200" : "border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700")}><Icon size={21} />{label}</button>)}</div>
      {kind !== "dm" && <div className="mb-5 space-y-4"><label className="block text-sm font-medium">Name <span className="text-red-500">*</span><input disabled={busy} autoFocus value={name} maxLength={80} onChange={e => setName(e.target.value)} placeholder={kind === "channel" ? "e.g. product-launch" : "e.g. Design team"} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-cyan-600 dark:border-slate-600" /></label><label className="block text-sm font-medium">Purpose <span className="font-normal text-slate-400">(optional)</span><textarea disabled={busy} value={description} maxLength={500} rows={2} onChange={e => setDescription(e.target.value)} placeholder="What will people discuss here?" className="mt-1.5 w-full resize-none rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm outline-none focus:border-cyan-600 dark:border-slate-600" /></label></div>}
      {kind === "channel" && <div className="mb-5 grid grid-cols-2 gap-2">{(["private", "public"] as const).map(value => <button disabled={busy} key={value} onClick={() => setVisibility(value)} className={"rounded-xl border p-3 text-left " + (visibility === value ? "border-cyan-600 bg-cyan-50/60 dark:bg-cyan-950/40" : "border-slate-200 dark:border-slate-700")}><span className="flex items-center gap-2 text-sm font-medium">{value === "private" ? <Lock size={15} /> : <Hash size={15} />}{value === "private" ? "Private" : "Company channel"}</span><span className="mt-1 block text-xs leading-relaxed text-slate-500">{value === "private" ? "Only invited members can access it." : "Anyone in your company can discover and join."}</span></button>)}</div>}
      <h3 className="mb-2 text-sm font-medium">{kind === "dm" ? "Who would you like to message?" : "Invite teammates"}</h3>
      <fieldset disabled={busy}><PeoplePicker selected={selected} onChange={setSelected} maximum={maximum} single={kind === "dm"} /></fieldset>
      {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950">{error}</p>}
    </div>
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700"><p className="max-w-60 text-xs leading-relaxed text-slate-400">{kind === "dm" ? "Private between you and your teammate." : "Invited members can read this space’s history."}</p><button disabled={busy || selected.length > maximum || (kind === "dm" ? selected.length !== 1 : !name.trim())} onClick={() => void submit()} className="flex shrink-0 items-center gap-2 rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-800 disabled:opacity-40">{busy && <Loader2 size={15} className="animate-spin" />}{kind === "dm" ? "Open message" : kind === "channel" ? "Create channel" : "Create group"}</button></footer>
  </ChatDialog>;
}
