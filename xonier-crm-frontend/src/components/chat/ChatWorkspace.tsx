"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Archive, ArrowLeft, ArrowUpRight, ChevronDown, Hash, Headphones, Info, Loader2, Lock, MessageSquare, Phone, Plus, Search, Settings2, Users, Video, Wifi, WifiOff, X } from "lucide-react";
import { toast } from "react-toastify";
import { chatApi, chatError } from "@/src/services/chat.service";
import { conversationName, type ChatMessage, type Conversation } from "@/src/types/chat";
import { useChat } from "./ChatProvider";
import { useMessages } from "./useMessages";
import ChatComposer from "./ChatComposer";
import MessageList from "./MessageList";
import ConversationDialog from "./ConversationDialog";
import ConversationSettings from "./ConversationSettings";
import ChatDialog, { PersonAvatar } from "./ChatDialog";

function SpaceIcon({ conversation, size = 18 }: { conversation: Conversation; size?: number }) { return conversation.kind === "channel" ? conversation.visibility === "private" ? <Lock size={size} /> : <Hash size={size} /> : <Users size={size} />; }
function Thread({ conversation, parent, close, presence }: { conversation: Conversation; parent: ChatMessage; presence: string[]; close: () => void }) {
  const { uid } = useChat();
  const timeline = useMessages(conversation.id, parent.id);
  return <aside className="absolute inset-0 z-30 flex min-h-0 flex-col border-l border-slate-200 bg-white xl:static xl:w-[360px] xl:shrink-0 dark:border-slate-700 dark:bg-slate-900">
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-slate-200 px-5 dark:border-slate-700"><div><h2 className="text-sm font-semibold">Thread</h2><p className="mt-1 text-xs text-slate-400">Keep the discussion in context</p></div><button aria-label="Close thread" onClick={close} className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"><X size={18} /></button></header>
    <div className="shrink-0 border-b border-slate-100 p-5 dark:border-slate-800"><p className="text-xs font-semibold">{parent.senderName}</p><p className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">{parent.text || "Shared a file"}</p></div>
    {timeline.error && <p role="alert" className="px-4 py-2 text-xs text-red-500">{timeline.error}</p>}
    <MessageList {...timeline} readonly={conversation.archived} presence={presence} />
    {!conversation.archived && <ChatComposer cid={conversation.id} parentId={parent.id} onSend={(command, files) => timeline.send(command, conversation.memberNames[uid] || "You", files)} />}
  </aside>;
}
function ConversationView({ conversation, back }: { conversation: Conversation; back: () => void }) {
  const { uid, connection, subscribe, markRead, startCall, joinCall, calls } = useChat();
  const [thread, setThread] = useState<ChatMessage | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [online, setOnline] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, { name: string; until: number }>>({});
  const [history, setHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [callHistory, setCallHistory] = useState<typeof calls>([]);
  const timeline = useMessages(conversation.id, null, search);
  const activeCall = calls.find(call => call.conversationId === conversation.id && ["ringing", "live"].includes(call.status));
  const other = conversation.memberIds.find(id => id !== uid) || "";
  const name = conversationName(conversation, uid);
  const isDirect = conversation.kind === "dm";
  const activeOnline = connection === "online" ? online : [];
  useEffect(() => { const timer = setTimeout(() => setSearch(searchInput.trim()), 250); return () => clearTimeout(timer); }, [searchInput]);
  useEffect(() => {
    let cancelled = false;
    const presence = () => void chatApi.presence(conversation.id).then(result => { if (!cancelled) setOnline(result.onlineIds); }).catch(() => { if (!cancelled) setOnline([]); });
    presence(); const timer = setInterval(presence, 15000);
    const expire = setInterval(() => setTyping(previous => Object.values(previous).some(value => value.until <= Date.now()) ? Object.fromEntries(Object.entries(previous).filter(([, value]) => value.until > Date.now())) : previous), 1000);
    const stop = subscribe(event => { if (event.conversationId === conversation.id && event.event === "typing") { const data = event.data as { userId: string; name: string }; if (data.userId !== uid) setTyping(previous => ({ ...previous, [data.userId]: { name: data.name, until: Date.now() + 4000 } })); } });
    return () => { cancelled = true; clearInterval(timer); clearInterval(expire); stop(); };
  }, [conversation.id, uid, subscribe]);
  useEffect(() => {
    if (!history) return;
    let cancelled = false;
    void Promise.resolve().then(() => { if (!cancelled) setHistoryLoading(true); });
    void chatApi.calls(conversation.id).then(items => { if (!cancelled) setCallHistory(items); }).catch(cause => toast.error(chatError(cause))).finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [history, conversation.id]);
  const read = useCallback((seq: number) => markRead(conversation.id, seq), [conversation.id, markRead]);
  return <div className="relative flex min-h-0 min-w-0 flex-1 overflow-hidden">
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex h-20 shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 md:px-6 dark:border-slate-700">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3"><button aria-label="Back to conversations" onClick={back} className="md:hidden"><ArrowLeft size={19} /></button>{isDirect ? <span className="hidden sm:inline-flex"><PersonAvatar name={name} online={activeOnline.includes(other)} /></span> : <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-cyan-700 dark:bg-slate-800 dark:text-cyan-300 sm:flex"><SpaceIcon conversation={conversation} size={22} /></span>}<button onClick={() => setSettings(true)} className="min-w-0 text-left" aria-label="Open conversation settings"><span className="flex items-center gap-1.5"><h1 className="truncate text-[15px] font-semibold tracking-tight">{name}</h1><ChevronDown size={14} className="shrink-0 text-slate-400" /></span><span className="mt-1 block truncate text-[11px] text-slate-400">{conversation.archived ? "Archived · Read-only" : isDirect ? connection !== "online" ? "Presence unavailable while reconnecting" : activeOnline.includes(other) ? "Active now" : "No recent activity" : conversation.memberIds.length + " members · " + activeOnline.length + " active"}</span></button></div>
        <div className="flex shrink-0 items-center gap-1">{!conversation.archived && <><button title="Voice call" aria-label="Start voice call" onClick={() => void startCall(conversation.id, "voice")} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:p-2.5 hover:text-cyan-700 dark:hover:bg-slate-800"><Phone size={18} /></button><button title="Video call" aria-label="Start video call" onClick={() => void startCall(conversation.id, "video")} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:p-2.5 hover:text-cyan-700 dark:hover:bg-slate-800"><Video size={20} /></button></>}<span className="mx-1 hidden h-5 w-px bg-slate-200 sm:block dark:bg-slate-700" /><button aria-label="Search conversation" title="Search messages" onClick={() => setSearchOpen(!searchOpen)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:p-2.5 dark:hover:bg-slate-800"><Search size={18} /></button><button aria-label="Manage members and conversation" title="Members & settings" onClick={() => setSettings(true)} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 sm:p-2.5 dark:hover:bg-slate-800"><Settings2 size={18} /></button></div>
      </header>
      {!searchOpen && <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-6 py-2 text-xs text-slate-400 dark:border-slate-800"><Info size={12} className="shrink-0" /><p className="truncate">{conversation.description || (isDirect ? "Private direct conversation" : "Messages, files and shared decisions")}</p><button onClick={() => setHistory(!history)} className="ml-auto shrink-0 text-[11px] hover:text-cyan-700">{history ? "Messages" : "Call history"}</button></div>}
      {searchOpen && <div className="flex shrink-0 items-center gap-2 border-b border-slate-100 px-5 py-2.5 dark:border-slate-800"><Search size={14} className="text-slate-400" /><input autoFocus aria-label="Search this conversation" value={searchInput} onChange={e => setSearchInput(e.target.value)} maxLength={100} placeholder="Search messages in this conversation" className="min-w-0 flex-1 bg-transparent py-1 text-xs outline-none" /><button aria-label="Close search" onClick={() => { setSearchInput(""); setSearchOpen(false); }}><X size={15} /></button></div>}
      {conversation.archived && <div className="flex shrink-0 items-center gap-2 bg-amber-50 px-6 py-3 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200"><Archive size={15} />This conversation is archived. Messages and files are preserved.{conversation.ownerId === uid && <button onClick={() => setSettings(true)} className="ml-auto font-semibold underline">Manage</button>}</div>}
      {activeCall && <div className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-100 bg-cyan-50 px-6 py-2.5 dark:border-cyan-900 dark:bg-cyan-950"><span className="flex items-center gap-2 text-xs font-medium text-cyan-800 dark:text-cyan-200"><Headphones size={15} />{activeCall.kind === "video" ? "Video call" : "Voice call"} · {activeCall.participants.length ? activeCall.participants.length + " joined" : "Waiting for teammates"}</span><button onClick={() => void joinCall(activeCall)} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white">Join call</button></div>}
      {history ? <div className="flex-1 overflow-auto p-6"><h2 className="mb-5 text-sm font-semibold">Call history</h2>{historyLoading ? <Loader2 size={20} className="animate-spin text-cyan-600" /> : !callHistory.length ? <p className="text-sm text-slate-400">No calls in this conversation yet.</p> : callHistory.map(call => <div key={call.id} className="mb-3 flex items-center gap-3 rounded-xl border border-slate-200 p-4 dark:border-slate-700"><span className="rounded-xl bg-slate-100 p-3 text-cyan-700 dark:bg-slate-800">{call.kind === "video" ? <Video size={19} /> : <Phone size={18} />}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{call.creatorName}</p><p className="mt-1 text-xs text-slate-400">{new Date(call.createdAt).toLocaleString()} · {call.kind}</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] capitalize text-slate-500 dark:bg-slate-800">{call.status}</span></div>)}</div> : <>
        {timeline.error && <p role="alert" className="shrink-0 bg-amber-50 px-6 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">{timeline.error}</p>}
        <MessageList {...timeline} onThread={setThread} onRead={read} readonly={conversation.archived} presence={activeOnline} />
        <p aria-live="polite" className="h-5 shrink-0 px-6 text-[11px] text-slate-400">{Object.values(typing).map(item => item.name).join(", ")}{Object.keys(typing).length ? " is typing…" : ""}</p>
        {!search && !conversation.archived && <ChatComposer key={conversation.id} cid={conversation.id} onSend={(command, files) => timeline.send(command, conversation.memberNames[uid] || "You", files)} />}
      </>}
    </section>
    {thread && <Thread key={thread.id} conversation={conversation} parent={thread} presence={activeOnline} close={() => setThread(null)} />}
    {settings && <ConversationSettings conversation={conversation} online={activeOnline} close={() => setSettings(false)} onLeft={back} />}
  </div>;
}
export default function ChatWorkspace() {
  const { uid, conversations, capabilities, connection, error, onlineIds, refresh } = useChat();
  const router = useRouter();
  const selected = useSearchParams().get("conversation") || "";
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const [filter, setFilter] = useState<"all" | "unread" | "channels" | "archived">("all");
  const [create, setCreate] = useState(false);
  const [discover, setDiscover] = useState<Pick<Conversation, "id" | "name" | "description">[] | null>(null);
  const [discoverQuery, setDiscoverQuery] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [joining, setJoining] = useState("");
  const searchBox = useRef<HTMLInputElement>(null);
  const current = conversations.find(item => item.id === selected);
  const visible = useMemo(() => conversations.filter(item => conversationName(item, uid).toLowerCase().includes(deferred.toLowerCase()) && (filter === "archived" ? item.archived : !item.archived) && (filter !== "unread" || !!item.unread) && (filter !== "channels" || item.kind === "channel")), [conversations, deferred, filter, uid]);
  const select = useCallback((id: string) => { router.replace(id ? "/communication?conversation=" + encodeURIComponent(id) : "/communication", { scroll: false }); }, [router]);
  const browse = async () => { setDiscoverLoading(true); setDiscover([]); try { setDiscover(await chatApi.discover()); } catch (cause) { toast.error(chatError(cause)); } finally { setDiscoverLoading(false); } };
  const join = async (id: string) => { if (joining) return; setJoining(id); try { await chatApi.joinChannel(id); await refresh(); select(id); setDiscover(null); } catch (cause) { toast.error(chatError(cause)); } finally { setJoining(""); } };
  return <div className="flex h-[calc(100dvh-112px)] min-h-[520px] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
    <aside className={(current ? "hidden md:flex " : "flex ") + "w-full shrink-0 flex-col border-r border-slate-200 bg-slate-50/80 md:w-[280px] lg:w-[304px] dark:border-slate-700 dark:bg-slate-900"}>
      <header className="flex h-20 shrink-0 items-center justify-between px-5"><div><h2 className="text-[17px] font-bold tracking-tight">Communication</h2><span className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-400">{connection === "online" ? <Wifi size={11} className="text-cyan-600" /> : <WifiOff size={11} />}{connection === "online" ? "Your team workspace" : connection === "connecting" ? "Connecting securely…" : "Reconnecting · messages stay safe"}</span></div><button aria-label="New conversation" title="New conversation" disabled={!capabilities?.ready} onClick={() => setCreate(true)} className="rounded-xl border border-slate-200 bg-white p-2.5 text-cyan-700 shadow-sm transition hover:border-cyan-600 disabled:opacity-30 dark:border-slate-600 dark:bg-slate-800 dark:text-cyan-300"><Plus size={18} /></button></header>
      <div className="px-4"><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 focus-within:border-cyan-600 dark:border-slate-600 dark:bg-slate-800"><Search size={15} className="text-slate-400" /><input ref={searchBox} aria-label="Find a conversation" placeholder="Find a conversation" value={query} onChange={e => setQuery(e.target.value)} className="w-full bg-transparent py-2.5 text-xs outline-none" />{query && <button aria-label="Clear conversation search" onClick={() => setQuery("")}><X size={12} /></button>}</div><div className="my-3 flex items-center gap-1">{(["all", "unread", "channels"] as const).map(item => <button key={item} onClick={() => setFilter(item)} className={"rounded-lg px-3 py-1.5 text-[11px] font-medium capitalize transition " + (filter === item ? "bg-white text-cyan-800 shadow-sm dark:bg-slate-700 dark:text-cyan-200" : "text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800")}>{item}</button>)}<button aria-label="Archived conversations" title="Archived conversations" onClick={() => setFilter(filter === "archived" ? "all" : "archived")} className={"ml-auto rounded-lg p-1.5 " + (filter === "archived" ? "bg-white text-cyan-700 shadow-sm dark:bg-slate-700" : "text-slate-400")}><Archive size={14} /></button></div></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">{!capabilities && !error ? <div className="space-y-3 p-3">{[0, 1, 2].map(item => <div key={item} className="h-16 animate-pulse rounded-xl bg-slate-200/50 dark:bg-slate-800" />)}</div> : visible.map(item => {
        const name = conversationName(item, uid); const other = item.memberIds.find(id => id !== uid) || "";
        return <button key={item.id} onClick={() => select(item.id)} aria-current={selected === item.id ? "page" : undefined} className={"mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition " + (selected === item.id ? "bg-cyan-50 ring-1 ring-inset ring-cyan-200/60 dark:bg-cyan-950/60 dark:ring-cyan-800" : "hover:bg-slate-100 dark:hover:bg-slate-800")}>{item.kind === "dm" ? <PersonAvatar name={name} online={onlineIds.includes(other)} /> : <span className={"flex h-10 w-10 shrink-0 items-center justify-center rounded-xl " + (selected === item.id ? "bg-cyan-700 text-white" : "border border-slate-200 bg-white text-slate-500 dark:border-slate-600 dark:bg-slate-800")}><SpaceIcon conversation={item} /></span>}<span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className={"truncate text-xs " + (item.unread ? "font-bold text-slate-900 dark:text-white" : "font-medium")}>{name}</span>{item.lastMessage && <time className="shrink-0 text-[9px] tabular-nums text-slate-400">{new Date(item.updatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>}</span><span className="mt-1.5 flex items-center justify-between gap-2"><span className="truncate text-[11px] text-slate-400">{item.archived ? "Archived · history preserved" : item.lastMessage?.text || item.description || "No messages yet"}</span>{!!item.unread && <span className="shrink-0 rounded-full bg-cyan-700 px-1.5 py-0.5 text-[9px] font-semibold text-white">{item.unread > 99 ? "99+" : item.unread}</span>}</span></span></button>;
      })}{!visible.length && capabilities?.ready && <div className="px-5 py-10 text-center"><Search size={22} className="mx-auto mb-3 text-slate-300" /><p className="text-xs font-medium text-slate-500">{query ? "No matching conversations" : filter === "unread" ? "You’re all caught up" : filter === "archived" ? "No archived conversations" : "Your conversations start here"}</p><p className="mt-2 text-[11px] leading-relaxed text-slate-400">{query ? "Try a different name or channel." : "Create a space or message a teammate."}</p></div>}</div>
      <button disabled={!capabilities?.ready} onClick={() => void browse()} className="flex shrink-0 items-center gap-2 border-t border-slate-200 px-5 py-4 text-xs font-medium text-slate-500 transition hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"><Hash size={15} />Explore company channels<ArrowUpRight size={13} className="ml-auto" /></button>
    </aside>
    {error ? <div role="alert" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-3 p-8 text-center"><WifiOff size={30} className="text-amber-500" /><h1 className="font-semibold">Communication is unavailable</h1><p className="max-w-md text-sm leading-relaxed text-slate-500">{error}</p><button onClick={() => window.location.reload()} className="rounded-xl border border-slate-300 px-4 py-2 text-xs">Reconnect</button></div> : current ? <ConversationView key={current.id} conversation={current} back={() => select("")} /> : <div className="hidden min-w-0 flex-1 flex-col items-center justify-center p-10 text-center md:flex"><span className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-cyan-50 text-cyan-700 ring-8 ring-cyan-50/40 dark:bg-cyan-950 dark:ring-cyan-950/30"><MessageSquare size={36} strokeWidth={1.5} /></span><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-400">Your people. Your workspace.</p><h1 className="mt-3 text-2xl font-semibold tracking-tight">Move the conversation forward.</h1><p className="mt-3 max-w-sm text-sm leading-7 text-slate-400">A direct message for a quick answer. A channel for a shared goal. Keep your team’s work and decisions together.</p><button disabled={!capabilities?.ready} onClick={() => setCreate(true)} className="mt-7 flex items-center gap-2 rounded-xl bg-cyan-700 px-5 py-3 text-sm font-medium text-white transition hover:bg-cyan-800 disabled:opacity-30"><Plus size={17} />Start a conversation</button></div>}
    {create && <ConversationDialog close={() => setCreate(false)} onSelect={select} />}
    {discover && <ChatDialog title="Explore company channels" subtitle="Find the right space for your work. Only public channels in your company appear here." close={() => { if (!joining) setDiscover(null); }} busy={!!joining}><div className="overflow-y-auto p-6"><div className="mb-4 flex items-center gap-2 rounded-xl border border-slate-300 px-3 dark:border-slate-600"><Search size={15} className="text-slate-400" /><input aria-label="Find a company channel" value={discoverQuery} onChange={e => setDiscoverQuery(e.target.value)} placeholder="Find a channel" className="w-full bg-transparent py-3 text-sm outline-none" /></div>{discoverLoading ? <div className="flex justify-center p-8"><Loader2 size={22} className="animate-spin text-cyan-600" /></div> : !discover.filter(item => item.name.toLowerCase().includes(discoverQuery.toLowerCase())).length ? <p className="py-8 text-center text-sm text-slate-400">No matching public channels to join.</p> : discover.filter(item => item.name.toLowerCase().includes(discoverQuery.toLowerCase())).map(item => <div key={item.id} className="flex items-center gap-3 border-b border-slate-100 py-4 last:border-0 dark:border-slate-700"><span className="rounded-xl bg-slate-100 p-3 text-cyan-700 dark:bg-slate-800"><Hash size={20} /></span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{item.name}</h3><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-slate-400">{item.description || "A company conversation"}</p></div><button disabled={!!joining} onClick={() => void join(item.id)} className="rounded-lg bg-cyan-700 px-3 py-2 text-xs font-medium text-white disabled:opacity-40">{joining === item.id ? "Joining…" : "Join"}</button></div>)}</div></ChatDialog>}
  </div>;
}
