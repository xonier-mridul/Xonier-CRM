"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { MessageSquare, Phone, PhoneOff, Video } from "lucide-react";
import { toast } from "react-toastify";
import type { RootState } from "@/src/store";
import { chatApi, chatError, websocketUrl } from "@/src/services/chat.service";
import type { Capabilities, ChatCall, ChatEvent, Conversation, JoinCall } from "@/src/types/chat";

const CallRoom = dynamic(() => import("./CallRoom"), { ssr: false });
interface ChatContextValue {
  uid: string; conversations: Conversation[]; capabilities: Capabilities | null;
  connection: "connecting" | "online" | "offline"; error: string;
  refresh: () => Promise<void>;
  subscribe: (fn: (event: ChatEvent) => void) => () => void;
  typing: (cid: string) => void;
  startCall: (cid: string, kind: "voice" | "video") => Promise<void>;
  joinCall: (call: ChatCall) => Promise<void>;
  calls: ChatCall[];
}
const ChatContext = createContext<ChatContextValue | null>(null);
export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error("ChatProvider is required");
  return context;
}

export default function ChatProvider({ children }: { children: React.ReactNode }) {
  const auth = useSelector((s: RootState) => s.auth);
  const accountKey = auth.user?.id || auth.user?._id || "signed-out";
  // A different login gets a fresh socket, state and call lifecycle. In-flight
  // requests from the previous account cannot populate the new account's inbox.
  return <ChatSession key={accountKey}>{children}</ChatSession>;
}

function ChatSession({ children }: { children: React.ReactNode }) {
  const auth = useSelector((s: RootState) => s.auth);
  const accountId = auth.user?.id || auth.user?._id || "";
  const enabled = Boolean(accountId && auth.user?.companyId && !auth.isAdmin);
  const [uid, setUid] = useState(accountId);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [calls, setCalls] = useState<ChatCall[]>([]);
  const [connection, setConnection] = useState<ChatContextValue["connection"]>("offline");
  const [error, setError] = useState("");
  const [room, setRoom] = useState<JoinCall | null>(null);
  const [joining, setJoining] = useState(false);
  const socket = useRef<WebSocket | null>(null);
  const listeners = useRef(new Set<(event: ChatEvent) => void>());

  const refresh = useCallback(async () => {
    const items = await chatApi.conversations();
    setConversations(items);
    const active = await Promise.all(items.filter(c => c.activeCallId).map(c => chatApi.calls(c.id)));
    setCalls(active.flat().filter(c => c.status === "ringing" || c.status === "live"));
  }, []);
  const subscribe = useCallback((fn: (event: ChatEvent) => void) => {
    listeners.current.add(fn);
    return () => { listeners.current.delete(fn); };
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    let heartbeat: ReturnType<typeof setInterval>;
    let refreshTimer: ReturnType<typeof setTimeout>;
    let failures = 0;
    const seen = new Set<string>();
    const sync = () => {
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => { if (!stopped) void refresh().catch(() => {}); }, 300);
    };
    const connect = async () => {
      if (stopped) return;
      setConnection("connecting");
      try {
        const { ticket } = await chatApi.ticket();
        if (stopped) return;
        const ws = new WebSocket(websocketUrl(ticket));
        socket.current = ws;
        ws.onopen = () => {
          failures = 0;
          setConnection("online");
          setError("");
          sync();
          listeners.current.forEach(fn => fn({ event: "sync.required" }));
          clearInterval(heartbeat);
          heartbeat = setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "ping" })); }, 20000);
        };
        ws.onmessage = message => {
          let event: ChatEvent;
          try { event = JSON.parse(message.data); } catch { return; }
          if (event.eventId) {
            if (seen.has(event.eventId)) return;
            seen.add(event.eventId);
            if (seen.size > 1000) seen.delete(seen.values().next().value!);
          }
          if (event.event === "call.updated") {
            const call = event.data as ChatCall;
            setCalls(previous => [...previous.filter(c => c.id !== call.id), ...(["ringing", "live"].includes(call.status) ? [call] : [])]);
            if (["ended", "missed"].includes(call.status)) setRoom(previous => previous?.call.id === call.id ? null : previous);
          }
          if (event.event === "conversation.removed") {
            setConversations(previous => previous.filter(c => c.id !== event.conversationId));
            setRoom(previous => previous?.call.conversationId === event.conversationId ? null : previous);
          }
          if (["message.created", "message.updated", "conversation.updated", "sync.required", "call.updated"].includes(event.event)) sync();
          listeners.current.forEach(fn => fn(event));
        };
        ws.onerror = () => { ws.close(); };
        ws.onclose = () => {
          clearInterval(heartbeat);
          if (stopped) return;
          setConnection("offline");
          retry = setTimeout(connect, Math.min(30000, 1000 * 2 ** Math.min(failures++, 5)) + Math.random() * 500);
        };
      } catch {
        if (stopped) return;
        setConnection("offline");
        retry = setTimeout(connect, Math.min(30000, 2000 * 2 ** Math.min(failures++, 4)));
      }
    };
    const initialize = async () => {
      try {
        const caps = await chatApi.capabilities();
        if (stopped) return;
        setUid(caps.currentUserId);
        setCapabilities(caps);
        if (!caps.ready) { setError(caps.reason); return; }
        await refresh();
        if (!stopped) await connect();
      } catch (err) { if (!stopped) setError(chatError(err)); }
    };
    void initialize();
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void refresh().catch(() => {});
    }, 15000);
    const wake = () => {
      if (document.visibilityState !== "visible") return;
      if (socket.current?.readyState === WebSocket.OPEN) {
        socket.current.send(JSON.stringify({ type: "ping" }));
        sync();
        listeners.current.forEach(fn => fn({ event: "sync.required" }));
      } else if (!socket.current || socket.current.readyState === WebSocket.CLOSED) {
        clearTimeout(retry);
        void connect();
      }
    };
    window.addEventListener("online", wake);
    document.addEventListener("visibilitychange", wake);
    return () => {
      stopped = true;
      clearTimeout(retry); clearTimeout(refreshTimer); clearInterval(heartbeat); clearInterval(interval);
      window.removeEventListener("online", wake);
      document.removeEventListener("visibilitychange", wake);
      socket.current?.close();
      socket.current = null;
      setConversations([]); setCalls([]); setRoom(null); setCapabilities(null);
    };
  }, [enabled, accountId, refresh]);

  const typing = useCallback((cid: string) => {
    if (socket.current?.readyState === WebSocket.OPEN) socket.current.send(JSON.stringify({ type: "typing", conversationId: cid }));
  }, []);
  const joinCall = useCallback(async (call: ChatCall) => {
    if (room) { toast.info("Leave your current call before joining another."); return; }
    setJoining(true);
    try { setRoom(await chatApi.joinCall(call.conversationId, call.id)); }
    catch (err) { toast.error(chatError(err)); }
    finally { setJoining(false); }
  }, [room]);
  const startCall = useCallback(async (cid: string, kind: "voice" | "video") => {
    if (room) { toast.info("Leave your current call before starting another."); return; }
    try {
      const call = await chatApi.startCall(cid, kind);
      await joinCall(call);
      await refresh();
    } catch (err) { toast.error(chatError(err)); }
  }, [room, joinCall, refresh]);
  const incoming = calls.find(c => c.createdBy !== uid && !c.declined.includes(uid) && c.status === "ringing" && c.id !== room?.call.id);

  return <ChatContext.Provider value={{ uid, conversations, capabilities, connection, error, refresh, subscribe, typing, startCall, joinCall, calls }}>
    {children}
    {incoming && <div role="alert" className="fixed bottom-6 right-6 z-[150] w-80 rounded-2xl border border-cyan-200 bg-white p-5 text-slate-900 shadow-2xl dark:border-slate-600 dark:bg-slate-800 dark:text-white">
      <div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-cyan-100 p-3 text-cyan-700">{incoming.kind === "video" ? <Video size={22} /> : <Phone size={22} />}</span><div><p className="font-semibold">{incoming.creatorName}</p><p className="text-sm text-slate-500">Incoming {incoming.kind} call</p></div></div>
      <div className="flex gap-2"><button disabled={joining} onClick={() => void joinCall(incoming)} className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-700 p-2 text-white disabled:opacity-50"><Phone size={16} />Join</button>
        <button onClick={() => void chatApi.declineCall(incoming.conversationId, incoming.id).then(() => setCalls(previous => previous.map(c => c.id === incoming.id ? { ...c, declined: [...c.declined, uid] } : c))).catch(err => toast.error(chatError(err)))} className="flex items-center gap-2 rounded-lg bg-red-50 px-3 text-red-700"><PhoneOff size={16} />Decline</button></div>
    </div>}
    {room && <CallRoom session={room} onLeave={() => { setRoom(null); void refresh().catch(() => {}); }} canEnd={room.call.createdBy === uid || conversations.find(c => c.id === room.call.conversationId)?.ownerId === uid} />}
  </ChatContext.Provider>;
}

export function ChatNavLink() {
  const { conversations } = useChat();
  const count = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  return <Link href="/chat" className="flex items-center gap-3 rounded-md px-4 py-2.5 text-sm transition hover:bg-cyan-600/10"><MessageSquare size={18} />Team chat{count > 0 && <span className="ml-auto rounded-full bg-cyan-700 px-2 py-0.5 text-xs text-white">{count > 99 ? "99+" : count}</span>}</Link>;
}
