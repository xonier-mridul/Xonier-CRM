"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Hash, Headphones, Info, Loader2, Lock, MessageSquare, Phone, Plus, Search, Users, Video, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "react-toastify";
import { chatApi, chatError } from "@/src/services/chat.service";
import { conversationName, type ChatMessage, type Conversation } from "@/src/types/chat";
import { useChat } from "./ChatProvider";
import { useMessages } from "./useMessages";
import ChatComposer from "./ChatComposer";
import MessageList from "./MessageList";
import ConversationDialog from "./ConversationDialog";

function Thread({ cid, parent, close }: { cid: string; parent: ChatMessage; close: () => void }) {
  const timeline = useMessages(cid, parent.id);
  return <aside className="absolute inset-0 z-20 flex flex-col border-l border-slate-200 bg-white xl:static xl:w-96 xl:shrink-0 dark:border-slate-700 dark:bg-slate-900">
    <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-700"><h2 className="font-semibold">Thread</h2><button aria-label="Close thread" onClick={close}><X size={19} /></button></header>
    <div className="border-b border-slate-100 p-4 dark:border-slate-800"><p className="text-xs font-semibold">{parent.senderName}</p><p className="mt-1 max-h-28 overflow-auto whitespace-pre-wrap break-words text-sm text-slate-500">{parent.text || "Shared a file"}</p></div>
    {timeline.error && <p role="alert" className="p-3 text-xs text-red-500">{timeline.error}</p>}
    <MessageList {...timeline} />
    <ChatComposer cid={cid} parentId={parent.id} onSend={command => timeline.send(command, "You")} />
  </aside>;
}

function ConversationView({ conversation, back }: { conversation: Conversation; back: () => void }) {
  const { uid, capabilities, subscribe, refresh, startCall, joinCall, calls } = useChat();
  const [thread, setThread] = useState<ChatMessage | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [members, setMembers] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const [history, setHistory] = useState(false);
  const [callHistory, setCallHistory] = useState<typeof calls>([]);
  const timeline = useMessages(conversation.id, null, search);
  const activeCall = calls.find(c => c.conversationId === conversation.id && ["ringing", "live"].includes(c.status));
  useEffect(() => { const timer = setTimeout(() => setSearch(searchInput.trim()), 300); return () => clearTimeout(timer); }, [searchInput]);
  useEffect(() => {
    let cancelled = false;
    const presence = () => void chatApi.presence(conversation.id).then(p => { if (!cancelled) setOnline(p.onlineIds); }).catch(() => {});
    presence();
    const timer = setInterval(presence, 15000);
    const expire = setInterval(() => setTyping(previous => Object.fromEntries(Object.entries(previous).filter(([, value]) => value.until > Date.now()))), 1000);
    const stop = subscribe(event => {
      if (event.conversationId === conversation.id && event.event === "typing") {
        const data = event.data as { userId: string; name: string };
        if (data.userId !== uid) setTyping(previous => ({ ...previous, [data.userId]: { name: data.name, until: Date.now() + 4000 } }));
      }
    });
    return () => { cancelled = true; clearInterval(timer); clearInterval(expire); stop(); };
  }, [conversation.id, uid, subscribe]);
  useEffect(() => {
    if (history) void chatApi.calls(conversation.id).then(setCallHistory).catch(err => toast.error(chatError(err)));
  }, [history, conversation.id]);
  const read = useCallback((seq: number) => {
    void chatApi.read(conversation.id, seq).then(() => refresh()).catch(() => {});
  }, [conversation.id, refresh]);
  const invite = async () => {
    const name = window.prompt("Enter the teammate's name to search:");
    if (!name?.trim()) return;
    try {
      const people = (await chatApi.users(name)).filter(p => !conversation.memberIds.includes(p.id));
      if (people.length !== 1) { toast.info(people.length ? "Several teammates match. Enter a more specific name." : "No eligible teammate found."); return; }
      if (!window.confirm(`Add ${people[0].name} to this conversation? They will be able to read its history.`)) return;
      await chatApi.addMembers(conversation.id, [people[0].id]); await refresh();
    } catch (err) { toast.error(chatError(err)); }
  };
  return <div className="relative flex min-h-0 flex-1 overflow-hidden">
    <section className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-[73px] shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 md:px-5 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-3"><button aria-label="Back to conversations" onClick={back} className="md:hidden"><ArrowLeft size={20} /></button><span className="rounded-xl bg-cyan-50 p-2.5 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300">{conversation.kind === "channel" ? conversation.visibility === "private" ? <Lock size={19} /> : <Hash size={19} /> : conversation.kind === "group" ? <Users size={19} /> : <MessageSquare size={19} />}</span><div className="min-w-0"><h1 className="truncate text-base font-semibold">{conversationName(conversation, uid)}</h1><button onClick={() => setMembers(!members)} className="text-xs text-slate-400">{conversation.memberIds.length} members · {online.length} online</button></div></div>
        <div className="flex items-center gap-1"><button title={capabilities?.calls ? "Start voice call" : "Calling requires LiveKit setup"} aria-label="Start voice call" disabled={!capabilities?.calls} onClick={() => void startCall(conversation.id, "voice")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-800"><Phone size={18} /></button><button title="Start video call" aria-label="Start video call" disabled={!capabilities?.calls} onClick={() => void startCall(conversation.id, "video")} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-25 dark:hover:bg-slate-800"><Video size={20} /></button><button aria-label="Show members" onClick={() => setMembers(!members)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"><Info size={19} /></button></div>
      </header>
      {members && <div className="max-h-52 overflow-auto border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800"><div className="mb-3 flex items-center justify-between"><p className="text-xs text-slate-400">{conversation.description || "Conversation members"}</p>{conversation.ownerId === uid && conversation.kind !== "dm" && <button onClick={() => void invite()} className="text-xs font-semibold text-cyan-700 dark:text-cyan-300">+ Add member</button>}</div>{conversation.memberIds.map(id => <div key={id} className="flex items-center gap-2 py-1 text-xs"><span className={`h-2 w-2 rounded-full ${online.includes(id) ? "bg-emerald-500" : "bg-slate-300"}`} /><span>{conversation.memberNames[id]}{id === uid ? " (you)" : ""}</span>{id === conversation.ownerId && <span className="text-[10px] text-slate-400">Owner</span>}{conversation.ownerId === uid && id !== uid && conversation.kind !== "dm" && <button onClick={() => { if (window.confirm(`Remove ${conversation.memberNames[id]}?`)) void chatApi.removeMember(conversation.id, id).then(refresh).catch(err => toast.error(chatError(err))); }} className="ml-auto text-red-500">Remove</button>}</div>)}</div>}
      {activeCall && <div className="flex items-center justify-between gap-3 border-b border-cyan-100 bg-cyan-50 px-5 py-2 dark:border-cyan-900 dark:bg-cyan-950"><span className="flex items-center gap-2 text-xs text-cyan-800 dark:text-cyan-200"><Headphones size={15} />{activeCall.kind === "video" ? "Video call" : "Voice huddle"} · {activeCall.participants.length} joined</span><button onClick={() => void joinCall(activeCall)} className="rounded-lg bg-cyan-700 px-3 py-1 text-xs text-white">Join call</button></div>}
      <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-2 dark:border-slate-800"><Search size={14} className="text-slate-400" /><input aria-label="Search this conversation" value={searchInput} onChange={e => setSearchInput(e.target.value)} maxLength={100} placeholder="Search this conversation" className="min-w-0 flex-1 bg-transparent text-xs outline-none" />{searchInput && <button aria-label="Clear search" onClick={() => setSearchInput("")}><X size={13} /></button>}<button onClick={() => setHistory(!history)} className="text-xs text-slate-400">{history ? "Messages" : "Call history"}</button></div>
      {history ? <div className="flex-1 overflow-auto p-5"><h2 className="mb-4 text-sm font-semibold">Recent calls</h2>{!callHistory.length && <p className="text-sm text-slate-400">No calls yet.</p>}{callHistory.map(call => <div key={call.id} className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700"><Phone size={17} className="text-cyan-600" /><div><p>{call.creatorName} · {call.kind}</p><p className="text-xs text-slate-400">{new Date(call.createdAt).toLocaleString()} · {call.status}</p></div></div>)}</div> : <>
        {timeline.error && <p role="alert" className="bg-red-50 px-5 py-2 text-xs text-red-600 dark:bg-red-950 dark:text-red-300">{timeline.error}</p>}
        <MessageList {...timeline} onThread={setThread} onRead={read} />
        <p aria-live="polite" className="h-5 px-5 text-[11px] text-slate-400">{Object.values(typing).map(t => t.name).join(", ")}{Object.keys(typing).length ? " typing…" : ""}</p>
        {!search && <ChatComposer key={conversation.id} cid={conversation.id} onSend={command => timeline.send(command, conversation.memberNames[uid] || "You")} />}
      </>}
    </section>
    {thread && <Thread key={thread.id} cid={conversation.id} parent={thread} close={() => setThread(null)} />}
  </div>;
}

export default function ChatWorkspace() {
  const { uid, conversations, capabilities, connection, error, refresh } = useChat();
  const router = useRouter();
  const selected = useSearchParams().get("conversation") || "";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread" | "channels">("all");
  const [create, setCreate] = useState(false);
  const [discover, setDiscover] = useState<Pick<Conversation, "id" | "name" | "description">[] | null>(null);
  const current = conversations.find(c => c.id === selected);
  const visible = conversations.filter(c => conversationName(c, uid).toLowerCase().includes(query.toLowerCase()) && (filter !== "unread" || !!c.unread) && (filter !== "channels" || c.kind === "channel"));
  const select = (id: string) => {
    router.replace(id ? `/chat?conversation=${encodeURIComponent(id)}` : "/chat", { scroll: false });
  };
  return <div className="flex h-[calc(100dvh-112px)] min-h-[500px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <aside className={`${current ? "hidden md:flex" : "flex"} w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/70 md:w-64 lg:w-72 dark:border-slate-700 dark:bg-slate-900`}>
      <header className="flex h-[73px] shrink-0 items-center justify-between px-5"><div><h2 className="text-lg font-bold tracking-tight">Team chat</h2><span className="flex items-center gap-1 text-[10px] text-slate-400">{connection === "online" ? <Wifi size={10} className="text-emerald-500" /> : <WifiOff size={10} />} {connection === "online" ? "Connected" : connection === "connecting" ? "Connecting…" : "Reconnecting"}</span></div><button aria-label="New conversation" title="New conversation" disabled={!capabilities?.ready} onClick={() => setCreate(true)} className="rounded-xl bg-cyan-700 p-2 text-white shadow-sm hover:bg-cyan-800 disabled:opacity-30"><Plus size={19} /></button></header>
      <div className="px-4"><div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-800"><Search size={14} className="text-slate-400" /><input aria-label="Find a conversation" placeholder="Find a conversation…" value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent py-2 text-xs outline-none" /></div><div className="my-3 flex gap-1">{(["all", "unread", "channels"] as const).map(item => <button key={item} onClick={() => setFilter(item)} className={`rounded-md px-3 py-1.5 text-[11px] capitalize ${filter === item ? "bg-white font-semibold text-cyan-700 shadow-sm dark:bg-slate-700 dark:text-cyan-200" : "text-slate-400"}`}>{item}</button>)}</div></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{visible.map(c => <button key={c.id} onClick={() => select(c.id)} className={`mb-1 flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${selected === c.id ? "bg-cyan-100/70 dark:bg-cyan-950" : "hover:bg-slate-100 dark:hover:bg-slate-800"}`}><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${selected === c.id ? "bg-cyan-700 text-white" : "bg-white text-slate-500 dark:bg-slate-800"}`}>{c.kind === "channel" ? <Hash size={18} /> : c.kind === "group" ? <Users size={18} /> : <span className="text-sm font-semibold">{conversationName(c, uid)[0]}</span>}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-1"><span className={`truncate text-xs ${c.unread ? "font-bold" : "font-medium"}`}>{conversationName(c, uid)}</span>{!!c.unread && <span className="rounded-full bg-cyan-700 px-1.5 py-0.5 text-[9px] text-white">{c.unread > 99 ? "99+" : c.unread}</span>}</span><span className="mt-1 block truncate text-[11px] text-slate-400">{c.lastMessage?.text || (c.kind === "channel" ? c.description : "Start a conversation")}</span></span></button>)}
        {!visible.length && capabilities?.ready && <p className="px-4 py-10 text-center text-xs text-slate-400">{query ? "No matching conversations." : "Your conversations will appear here."}</p>}
      </div>
      <button disabled={!capabilities?.ready} onClick={() => void chatApi.discover().then(setDiscover).catch(err => toast.error(chatError(err)))} className="flex items-center gap-2 border-t border-slate-200 p-4 text-xs text-slate-500 disabled:opacity-30 dark:border-slate-700"><Hash size={16} />Browse company channels</button>
    </aside>
    {error ? <div role="alert" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center"><WifiOff size={32} className="text-amber-500" /><h1 className="font-semibold">Chat is not ready yet</h1><p className="max-w-md text-sm text-slate-500">{error}</p><button onClick={() => window.location.reload()} className="rounded-lg border border-slate-300 px-4 py-2 text-xs">Try again</button></div> : current ? <ConversationView key={current.id} conversation={current} back={() => select("")} /> : <div className="hidden flex-1 flex-col items-center justify-center gap-4 p-8 text-center md:flex"><span className="rounded-3xl bg-cyan-50 p-6 text-cyan-700 dark:bg-cyan-950"><MessageSquare size={42} strokeWidth={1.5} /></span><h1 className="text-xl font-semibold tracking-tight">Good work starts with a conversation.</h1><p className="max-w-sm text-sm leading-relaxed text-slate-400">Keep your team, ideas and decisions together. Message a teammate or create a channel for your next project.</p><button disabled={!capabilities?.ready} onClick={() => setCreate(true)} className="mt-2 flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-2.5 text-sm text-white disabled:opacity-30"><Plus size={16} />New conversation</button>{!capabilities && <Loader2 size={18} className="animate-spin text-slate-400" />}</div>}
    {create && <ConversationDialog close={() => setCreate(false)} onSelect={select} />}
    {discover && <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/50 p-4"><section role="dialog" aria-modal="true" aria-label="Browse company channels" className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl dark:bg-slate-900"><div className="mb-5 flex items-center justify-between"><h2 className="font-semibold">Explore company channels</h2><button aria-label="Close channel browser" onClick={() => setDiscover(null)}><X size={20} /></button></div><div className="max-h-80 overflow-auto">{discover.length === 0 && <p className="py-8 text-center text-sm text-slate-400">No public channels to join yet.</p>}{discover.map(c => <div key={c.id} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 dark:border-slate-700"><div className="min-w-0"><p className="truncate text-sm font-semibold"># {c.name}</p><p className="truncate text-xs text-slate-400">{c.description}</p></div><button onClick={() => void chatApi.joinChannel(c.id).then(async () => { await refresh(); select(c.id); setDiscover(null); }).catch(err => toast.error(chatError(err)))} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs text-white">Join</button></div>)}</div></section></div>}
  </div>;
}
