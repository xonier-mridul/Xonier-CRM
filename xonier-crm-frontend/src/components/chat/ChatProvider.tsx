"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { MessageSquare, Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "react-toastify";
import type { RootState } from "@/src/store";
import { chatApi, chatError, websocketUrl } from "@/src/services/chat.service";
import type { Capabilities, ChatCall, ChatEvent, Conversation, JoinCall, ChatMessage, CallPreferences } from "@/src/types/chat";

const CallRoom = dynamic(() => import("./CallRoom"), { ssr: false });
const CallSetup = dynamic(() => import("./CallSetup"), { ssr: false });
interface CallTarget { cid: string; kind: "voice" | "video"; call?: ChatCall }
interface ChatContextValue {
  uid: string; conversations: Conversation[]; capabilities: Capabilities | null; onlineIds: string[];
  connection: "connecting" | "online" | "offline"; error: string;
  refresh: () => Promise<void>; markRead: (cid: string, seq: number) => void;
  subscribe: (fn: (event: ChatEvent) => void) => () => void;
  typing: (cid: string) => void;
  startCall: (cid: string, kind: "voice" | "video") => Promise<void>;
  joinCall: (call: ChatCall) => Promise<void>; calls: ChatCall[];
}
const ChatContext = createContext<ChatContextValue | null>(null);
export function useChat() { const context = useContext(ChatContext); if (!context) throw new Error("ChatProvider is required"); return context; }
export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const user = useSelector((state: RootState) => state.auth.user);
  return <ChatSession key={user?.id || user?._id || "signed-out"}>{children}</ChatSession>;
}
function ChatSession({ children }: { children: React.ReactNode }) {
  const auth = useSelector((state: RootState) => state.auth);
  const uid = auth.user?.id || auth.user?._id || "";
  const enabled = Boolean(uid && auth.user?.companyId && !auth.isAdmin);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calls, setCalls] = useState<ChatCall[]>([]);
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [connection, setConnection] = useState<ChatContextValue["connection"]>("offline");
  const [error, setError] = useState("");
  const [room, setRoom] = useState<(JoinCall & { preferences: CallPreferences }) | null>(null);
  const [target, setTarget] = useState<CallTarget | null>(null);
  const [joining, setJoining] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const live = useRef(true);
  const refreshFlight = useRef<Promise<void> | null>(null);
  const busyCall = useRef(false);
  const removedConversations = useRef(new Set<string>());
  const endedCalls = useRef(new Set<string>());
  const readTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const listeners = useRef(new Set<(event: ChatEvent) => void>());
  const refresh = useCallback(async () => {
    if (refreshFlight.current) return refreshFlight.current;
    refreshFlight.current = (async () => {
      const items = await chatApi.conversations();
      if (!live.current) return;
      setConversations(previous => items.filter(item => !removedConversations.current.has(item.id)).map(item => {
        const existing = previous.find(old => old.id === item.id);
        return existing && (existing.lastSeq > item.lastSeq || (existing.settingsVersion || 1) > (item.settingsVersion || 1)) ? existing : item;
      }));
      const active = await Promise.all(items.filter(item => item.activeCallId).map(item => chatApi.calls(item.id).catch(() => [])));
      if (!live.current) return;
      setCalls(active.flat().filter(call => ["ringing", "live"].includes(call.status) && !endedCalls.current.has(call.id)));
    })().finally(() => { refreshFlight.current = null; });
    return refreshFlight.current;
  }, []);
  const subscribe = useCallback((fn: (event: ChatEvent) => void) => { listeners.current.add(fn); return () => { listeners.current.delete(fn); }; }, []);
  const markRead = useCallback((cid: string, seq: number) => {
    setConversations(previous => previous.map(item => item.id === cid ? { ...item, read: { ...item.read, [uid]: Math.max(item.read[uid] || 0, seq) }, unread: seq >= (item.lastMessage?.seq || 0) ? 0 : item.unread } : item));
    clearTimeout(readTimers.current[cid]);
    readTimers.current[cid] = setTimeout(() => { void chatApi.read(cid, seq).catch(() => {}); }, 350);
  }, [uid]);
  useEffect(() => {
    live.current = true;
    if (!enabled) return;
    let stopped = false, connecting = false, failures = 0;
    const timers = readTimers.current;
    let retry: ReturnType<typeof setTimeout>, heartbeat: ReturnType<typeof setInterval>;
    const seen = new Set<string>();
    const connect = async () => {
      if (stopped || connecting || socket.current?.readyState === WebSocket.OPEN) return;
      connecting = true; setConnection("connecting");
      try {
        const { ticket } = await chatApi.ticket();
        if (stopped) return;
        const ws = new WebSocket(websocketUrl(ticket)); socket.current = ws;
        ws.onopen = () => {
          connecting = false; failures = 0; setConnection("online"); setError("");
          void refresh().catch(() => {});
          listeners.current.forEach(fn => fn({ event: "sync.required" }));
          clearInterval(heartbeat);
          heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); }, 20000);
        };
        ws.onmessage = message => {
          let event: ChatEvent; try { event = JSON.parse(message.data); } catch { return; }
          if (event.eventId) { if (seen.has(event.eventId)) return; seen.add(event.eventId); if (seen.size > 2000) seen.delete(seen.values().next().value!); }
          if (event.event === "conversation.updated") {
            const item = event.data as Conversation;
            removedConversations.current.delete(item.id);
            setConversations(previous => {
              const existing = previous.find(old => old.id === item.id);
              if (existing && (existing.settingsVersion || 1) > (item.settingsVersion || 1)) return previous;
              const latest = existing && existing.lastSeq >= item.lastSeq ? { lastSeq: existing.lastSeq, lastMessage: existing.lastMessage } : {};
              return [{ ...item, ...latest, unread: existing?.unread || 0 }, ...previous.filter(old => old.id !== item.id)].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
            });
          }
          if (event.event === "conversation.removed") {
            if (event.conversationId) removedConversations.current.add(event.conversationId);
            setConversations(previous => previous.filter(item => item.id !== event.conversationId));
            setRoom(previous => previous?.call.conversationId === event.conversationId ? null : previous);
            setCalls(previous => previous.filter(call => call.conversationId !== event.conversationId));
          }
          if (["message.created", "message.updated"].includes(event.event)) {
            const message = event.data as ChatMessage;
            if (!message.parentId) setConversations(previous => previous.map(item => {
              if (item.id !== event.conversationId) return item;
              const isNew = event.event === "message.created" && message.seq > (item.lastMessage?.seq || 0);
              if (!isNew && item.lastMessage?.seq !== message.seq) return item;
              return { ...item, lastSeq: Math.max(item.lastSeq, message.seq), updatedAt: isNew ? message.createdAt : item.updatedAt,
                lastMessage: { text: message.deletedAt ? "Message deleted" : message.text.slice(0, 140) || "Shared a file", senderName: message.senderName, seq: message.seq },
                unread: (item.unread || 0) + (isNew && message.senderId !== uid && message.seq > (item.read[uid] || 0) ? 1 : 0) };
            }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
          }
          if (event.event === "call.updated") {
            const call = event.data as ChatCall;
            if (["ended", "missed"].includes(call.status)) endedCalls.current.add(call.id);
            else if (endedCalls.current.has(call.id)) return;
            setCalls(previous => [...previous.filter(item => item.id !== call.id), ...(["ringing", "live"].includes(call.status) ? [call] : [])]);
            if (["ended", "missed"].includes(call.status)) setRoom(previous => previous?.call.id === call.id ? null : previous);
          }
          if (event.event === "sync.required") void refresh().catch(() => {});
          listeners.current.forEach(fn => fn(event));
        };
        ws.onerror = () => ws.close();
        ws.onclose = () => { connecting = false; clearInterval(heartbeat); if (stopped) return; setConnection("offline"); setOnlineIds([]); retry = setTimeout(() => void connect(), Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)) + Math.random() * 500); };
      } catch { connecting = false; if (!stopped) { setConnection("offline"); retry = setTimeout(() => void connect(), Math.min(30000, 2000 * 2 ** Math.min(failures++, 4))); } }
    };
    void (async () => {
      try { const caps = await chatApi.capabilities(); if (stopped) return; setCapabilities(caps); if (!caps.ready) { setError(caps.reason); return; } await refresh(); if (!stopped) await connect(); }
      catch (cause) { if (!stopped) setError(chatError(cause)); }
    })();
    const interval = setInterval(() => { if (document.visibilityState === "visible") void refresh().catch(() => {}); }, 45000);
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      if (socket.current?.readyState === WebSocket.OPEN) { socket.current.send(JSON.stringify({ type: "ping" })); void refresh().catch(() => {}); listeners.current.forEach(fn => fn({ event: "sync.required" })); }
      else { clearTimeout(retry); void connect(); }
    };
    window.addEventListener("online", wake); document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true; live.current = false; clearTimeout(retry); clearInterval(heartbeat); clearInterval(interval);
      Object.values(timers).forEach(clearTimeout);
      window.removeEventListener("online", wake); document.removeEventListener("visibilitychange", wake);
      socket.current?.close(); socket.current = null;
    };
  }, [enabled, uid, refresh]);
  const presenceKey = [...new Set([uid, ...conversations.filter(item => item.kind === "dm").flatMap(item => item.memberIds)])].sort().join(",");
  useEffect(() => {
    if (connection !== "online" || !presenceKey) return;
    let cancelled = false;
    const check = async () => {
      const ids = presenceKey.split(",");
      try {
        const results = await Promise.all(Array.from({ length: Math.ceil(ids.length / 100) }, (_, index) => chatApi.presenceBatch(ids.slice(index * 100, (index + 1) * 100))));
        if (!cancelled) setOnlineIds(results.flatMap(result => result.onlineIds));
      } catch { if (!cancelled) setOnlineIds([]); }
    };
    check(); const timer = setInterval(check, 15000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [connection, presenceKey]);
  const typing = useCallback((cid: string) => { if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "typing", conversationId: cid })); }, []);
  const startCall = useCallback(async (cid: string, kind: "voice" | "video") => { if (room || busyCall.current) { toast.info("Leave your current call first."); return; } setTarget({ cid, kind }); }, [room]);
  const joinCall = useCallback(async (call: ChatCall) => { if (room || busyCall.current) { toast.info("Leave your current call first."); return; } setTarget({ cid: call.conversationId, kind: call.kind, call }); }, [room]);
  const connectCall = async (preferences: CallPreferences) => {
    if (!target || busyCall.current) return;
    busyCall.current = true; setJoining(true);
    try {
      const call = target.call || await chatApi.startCall(target.cid, target.kind);
      const session = await chatApi.joinCall(target.cid, call.id);
      setRoom({ ...session, preferences }); setTarget(null); void refresh().catch(() => {});
    } catch (cause) { toast.error(chatError(cause)); throw cause; }
    finally { busyCall.current = false; setJoining(false); }
  };
  const incoming = calls.find(call => call.createdBy !== uid && !call.declined.includes(uid) && call.status === "ringing" && call.id !== room?.call.id);
  const value = useMemo(() => ({ uid, conversations, capabilities, onlineIds, connection, error, refresh, subscribe, markRead, typing, startCall, joinCall, calls }), [uid, conversations, capabilities, onlineIds, connection, error, refresh, subscribe, markRead, typing, startCall, joinCall, calls]);
  return <ChatContext.Provider value={value}>
    {children}
    {incoming && !target && <div role="alert" className="fixed bottom-6 right-6 z-[150] w-80 rounded-2xl border border-cyan-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-600 dark:bg-slate-800 dark:text-white"><div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-cyan-50 p-3 text-cyan-700">{incoming.kind === "video" ? <Video size={22} /> : <Phone size={22} />}</span><div><p className="font-semibold">{incoming.creatorName}</p><p className="text-sm text-slate-500">Incoming {incoming.kind} call</p></div></div><div className="flex gap-2"><button onClick={() => void joinCall(incoming)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-700 p-2 text-white"><Phone size={16} />Review & join</button><button aria-label="Decline call" onClick={() => void chatApi.declineCall(incoming.conversationId, incoming.id).then(() => setCalls(previous => previous.map(call => call.id === incoming.id ? { ...call, declined: [...call.declined, uid] } : call))).catch(cause => toast.error(chatError(cause)))} className="rounded-lg bg-red-50 px-3 text-red-700"><PhoneOff size={17} /></button></div></div>}
    {target && <CallSetup kind={target.kind} joining={joining} ready={!!capabilities?.calls} reason={capabilities?.callsReason || "Calling is not configured for this workspace."} name={auth.user?.firstName || "Teammate"} close={() => { if (!joining) setTarget(null); }} onJoin={connectCall} />}
    {room && <CallRoom session={room} onLeave={() => { setRoom(null); void refresh().catch(() => {}); }} canEnd={room.call.createdBy === uid || conversations.find(item => item.id === room.call.conversationId)?.ownerId === uid} />}
  </ChatContext.Provider>;
}
export function ChatNavLink() {
  const { conversations } = useChat();
  const count = conversations.reduce((sum, item) => sum + (item.unread || 0), 0);
  return <Link href="/communication" className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition hover:bg-cyan-600/10"><MessageSquare size={18} />Communication{count > 0 && <span className="ml-auto rounded-full bg-cyan-700 px-2 py-0.5 text-xs text-white">{count > 99 ? "99+" : count}</span>}</Link>;
}
