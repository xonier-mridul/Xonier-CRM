"use client";
import { useEffect, useState } from "react";
import { Archive, ArrowLeft, Crown, Loader2, LogOut, Search, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { chatApi, chatError } from "@/src/services/chat.service";
import { conversationName, type ChatUser, type Conversation } from "@/src/types/chat";
import ChatDialog, { dialogText, PersonAvatar } from "./ChatDialog";
import PeoplePicker from "./PeoplePicker";
import { useChat } from "./ChatProvider";

export default function ConversationSettings({ conversation, online, close, onLeft }: { conversation: Conversation; online: string[]; close: () => void; onLeft: () => void }) {
  const { uid, refresh, capabilities } = useChat();
  const [view, setView] = useState<"members" | "details" | "add">("members");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ChatUser[]>([]);
  const [name, setName] = useState(conversation.name);
  const [description, setDescription] = useState(conversation.description);
  const [baseline, setBaseline] = useState({ name: conversation.name, description: conversation.description, version: conversation.settingsVersion || 1 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const owner = conversation.ownerId === uid;
  const managed = owner && conversation.kind !== "dm";
  const dirty = name !== baseline.name || description !== baseline.description;
  useEffect(() => {
    if (dirty) return;
    let cancelled = false;
    const sync = () => { if (cancelled) return; setName(conversation.name); setDescription(conversation.description); setBaseline({ name: conversation.name, description: conversation.description, version: conversation.settingsVersion || 1 }); };
    queueMicrotask(sync);
    return () => { cancelled = true; };
  }, [conversation.name, conversation.description, conversation.settingsVersion, dirty]);
  const perform = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true); setError("");
    try { await action(); await refresh(); toast.success(message); }
    catch (cause) { setError(chatError(cause)); }
    finally { setBusy(false); }
  };
  const confirm = async (action: "remove" | "transfer" | "archive" | "leave", id?: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const titles = { remove: "Remove this member?", transfer: "Transfer ownership?", archive: conversation.archived ? "Restore this conversation?" : "Archive this conversation?", leave: "Leave this conversation?" };
      const text = action === "remove" ? (conversation.memberNames[id!] || "This teammate") + " will lose access to this conversation and its history. You can invite them again later."
        : action === "transfer" ? (conversation.memberNames[id!] || "This teammate") + " will become the owner. You will remain a member but lose management permissions."
        : action === "leave" ? "You will lose access to this conversation. An owner will need to invite you again to a private space."
        : conversation.archived ? "Members can send messages and start calls again." : "History stays available, but new messages and calls will be disabled. This can be restored later.";
      const result = await ConfirmPopup({ title: titles[action], text: dialogText(text), btnTxt: action === "archive" ? conversation.archived ? "Restore" : "Archive" : action === "transfer" ? "Transfer ownership" : action === "leave" ? "Leave conversation" : "Remove member" });
      if (!result.isConfirmed) return;
      if (action === "remove") await perform(() => chatApi.removeMember(conversation.id, id!), "Member removed");
      if (action === "transfer") await perform(() => chatApi.updateConversation(conversation.id, { version: conversation.settingsVersion || 1, ownerId: id }), "Ownership transferred");
      if (action === "archive") await perform(() => chatApi.updateConversation(conversation.id, { version: conversation.settingsVersion || 1, archived: !conversation.archived }), conversation.archived ? "Conversation restored" : "Conversation archived");
      if (action === "leave") { await chatApi.removeMember(conversation.id, uid); await refresh(); onLeft(); close(); }
    } catch (cause) { setError(chatError(cause)); }
    finally { setBusy(false); }
  };
  const save = () => perform(async () => {
    const updated = await chatApi.updateConversation(conversation.id, { version: baseline.version, name: name.trim(), description: description.trim() });
    setName(updated.name); setDescription(updated.description); setBaseline({ name: updated.name, description: updated.description, version: updated.settingsVersion || 1 });
  }, "Conversation details saved");
  const ids = conversation.memberIds.filter(id => (conversation.memberNames[id] || "").toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b === conversation.ownerId) - Number(a === conversation.ownerId));
  return <ChatDialog title={conversationName(conversation, uid)} subtitle={conversation.kind === "dm" ? "Private direct message" : (conversation.visibility === "public" ? "Company channel" : "Private space") + " · " + conversation.memberIds.length + " members"} close={close} busy={busy}>
    <nav className="flex shrink-0 gap-6 border-b border-slate-200 px-6 dark:border-slate-700">{(["members", "details"] as const).map(tab => <button disabled={busy} key={tab} onClick={() => { setView(tab); setError(""); }} className={"border-b-2 py-3 text-sm font-medium capitalize " + (view === tab || (view === "add" && tab === "members") ? "border-cyan-600 text-cyan-700 dark:text-cyan-300" : "border-transparent text-slate-500")}>{tab === "members" ? "Members (" + conversation.memberIds.length + ")" : "Details & settings"}</button>)}</nav>
    <div className="overflow-y-auto p-6">
      {view === "add" ? <><button onClick={() => setView("members")} className="mb-4 flex items-center gap-1 text-xs font-medium text-slate-500"><ArrowLeft size={14} />Back to members</button><h3 className="mb-1 font-semibold">Invite teammates</h3><p className="mb-4 text-sm text-slate-500">New members will be able to read this conversation’s existing history.</p><fieldset disabled={busy}><PeoplePicker selected={selected} onChange={setSelected} exclude={conversation.memberIds} maximum={(capabilities?.maxMembers || 100) - conversation.memberIds.length} /></fieldset><button disabled={busy || !selected.length} onClick={() => void perform(async () => { await chatApi.addMembers(conversation.id, selected.map(user => user.id)); setSelected([]); setView("members"); }, "Teammates added")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-700 px-4 py-3 text-sm font-medium text-white disabled:opacity-40">{busy ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}Add {selected.length || ""} {selected.length === 1 ? "teammate" : "teammates"}</button></> : view === "members" ? <>
        <div className="mb-4 flex items-center gap-2"><div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-slate-300 px-3 dark:border-slate-600"><Search size={15} className="text-slate-400" /><input aria-label="Filter members" placeholder="Find a member" value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent py-2.5 text-sm outline-none" /></div>{managed && !conversation.archived && <button disabled={busy || conversation.memberIds.length >= (capabilities?.maxMembers || 100)} onClick={() => setView("add")} className="flex items-center gap-1.5 rounded-xl bg-cyan-700 px-3 py-2.5 text-sm font-medium text-white disabled:opacity-40"><UserPlus size={16} />Add</button>}</div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">{ids.map(id => <div key={id} className="flex items-center gap-3 py-3"><PersonAvatar name={conversation.memberNames[id] || "Teammate"} online={online.includes(id)} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{conversation.memberNames[id]}{id === uid && <span className="font-normal text-slate-400"> (you)</span>}</p><p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">{id === conversation.ownerId ? <><Crown size={11} />Owner</> : "Member"}{online.includes(id) && <span className="ml-1 text-emerald-600">· Active now</span>}</p></div>{managed && id !== uid && !conversation.archived && <div className="flex flex-col items-end gap-1"><button disabled={busy} onClick={() => void confirm("remove", id)} className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950">Remove</button><button disabled={busy} onClick={() => void confirm("transfer", id)} className="rounded px-2 py-1 text-[11px] text-slate-400 hover:text-cyan-700">Make owner</button></div>}</div>)}</div>{!ids.length && <p className="py-8 text-center text-sm text-slate-400">No matching members.</p>}<p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-400"><ShieldCheck size={14} className="shrink-0" />Presence reflects recent app activity, not guaranteed availability. Only the owner can add or remove members.</p>
      </> : <div className="space-y-5"><label className="block text-sm font-medium">Name<input disabled={!managed || busy} value={conversation.kind === "dm" ? conversationName(conversation, uid) : name} onChange={e => setName(e.target.value)} maxLength={80} className="mt-2 w-full rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm disabled:bg-slate-50 disabled:text-slate-500 dark:border-slate-600 dark:disabled:bg-slate-800" /></label><label className="block text-sm font-medium">Purpose<textarea disabled={!managed || busy} value={description} onChange={e => setDescription(e.target.value)} rows={3} maxLength={500} placeholder="What this space is for" className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-transparent px-3 py-2.5 text-sm disabled:bg-slate-50 dark:border-slate-600 dark:disabled:bg-slate-800" /></label>{managed && <button disabled={busy || !dirty || !name.trim()} onClick={() => void save()} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40">{busy ? "Saving…" : "Save changes"}</button>}<div className="rounded-xl bg-slate-50 p-4 text-sm dark:bg-slate-800"><p className="flex items-center gap-2 font-medium"><Users size={15} />{conversation.visibility === "public" ? "Discoverable within your company" : "Invite-only conversation"}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">Visibility is fixed when created. Removing a member immediately revokes their access to this space.</p></div>{conversation.kind !== "dm" && <div className="space-y-3 border-t border-slate-200 pt-4 dark:border-slate-700">{managed ? <><button disabled={busy} onClick={() => void confirm("archive")} className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium dark:border-slate-600"><Archive size={15} />{conversation.archived ? "Restore conversation" : "Archive conversation"}</button><p className="text-xs leading-relaxed text-slate-400">Archiving preserves messages and files. To leave as the owner, transfer ownership to a current member first.</p></> : !conversation.archived && <button disabled={busy} onClick={() => void confirm("leave")} className="flex items-center gap-2 text-sm font-medium text-red-600"><LogOut size={15} />Leave conversation</button>}</div>}</div>}
      {error && <div role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950 dark:text-red-300">{error}{error.includes("changed") && <button onClick={() => { void refresh(); close(); }} className="mt-2 block font-semibold underline">Reload conversation</button>}</div>}
    </div>
  </ChatDialog>;
}
