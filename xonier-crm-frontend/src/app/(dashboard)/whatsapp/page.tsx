"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useSelector } from "react-redux";
import { RootState } from "@/src/store";
import api from "@/src/lib/axios";
import { FaWhatsapp } from "react-icons/fa";
import { Loader2, RefreshCw, Send, Unplug, Search } from "lucide-react";

type Connection = { owner?: string; ownerName?: string; phone?: string; status: string; error?: string; qr?: string; qrExpiresAt?: number };
type Chat = { jid: string; name: string; preview?: string; timestamp: number; phone?: string | null };
type Contact = { jid: string; name: string | null; phone: string | null };
type Message = { messageId: string; text: string; type: string; fromMe: boolean; timestamp: number; status: number };
type Overview = { admin: boolean; currentUser: string; connections: Connection[] };
const errorMessage = (error: unknown) => axios.isAxiosError(error)
  ? error.response?.data?.message || "WhatsApp service is unavailable. Please try again." : "Unable to complete this action.";
const time = (value: number) => value ? new Date(value * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const statusLabel: Record<string, string> = { qr: "Scan QR", connecting: "Connecting…", connected: "Connected", reconnecting: "Reconnecting…", disconnected: "Disconnected", error: "Connection needs attention" };

export default function WhatsAppPage() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  return <WhatsAppInbox key={userId || "anonymous"} />;
}

function WhatsAppInbox() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connection, setConnection] = useState<Connection>({ status: "disconnected" });
  const [owner, setOwner] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [chatError, setChatError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [chatsLoaded, setChatsLoaded] = useState(false);
  const [refreshCount, setRefreshCount] = useState(0);
  const [contactSuggestions, setContactSuggestions] = useState<Contact[]>([]);
  const [view, setView] = useState<"chats" | "contacts">("chats");
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [contactsLoaded, setContactsLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [consent, setConsent] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const sendLock = useRef(false);
  const sendAttempt = useRef<{ jid: string; text: string; requestId: string } | null>(null);
  const generation = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const own = !owner || owner === overview?.currentUser;
  const viewedConnection = own ? connection : overview?.connections.find(item => item.owner === owner);
  const params = owner ? { owner } : {};

  const refreshConnection = useCallback(async (signal?: AbortSignal) => {
    const [summary, current] = await Promise.all([
      api.get<Overview>("/whatsapp/connections", { signal }),
      api.get<Connection>("/whatsapp/connection", { signal }),
    ]);
    if (signal?.aborted) return;
    setOverview(summary.data); setConnection(current.data); setConnectionError("");
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try { await refreshConnection(controller.signal); }
      catch (err) { if (active && !axios.isCancel(err)) setConnectionError(errorMessage(err)); }
      finally { pending = false; if (active) setLoading(false); }
    };
    void run();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void run(); }, 4000);
    return () => { active = false; controller.abort(); clearInterval(timer); };
  }, [refreshConnection, userId, refreshCount]);

  useEffect(() => { const timer = setInterval(() => setClock(Date.now()), 1000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const controller = new AbortController();
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api.get<Chat[]>("/whatsapp/chats", { params: owner ? { owner } : {}, signal: controller.signal });
        if (!controller.signal.aborted) {
          setChats(result.data);
          setChatsLoaded(true);
          setChatError("");
        }
      } catch (err) {
        if (!controller.signal.aborted && !axios.isCancel(err)) setChatError(errorMessage(err));
      } finally { pending = false; }
    };
    void run(); const timer = setInterval(() => { if (document.visibilityState === "visible") void run(); }, 2000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [owner, userId, refreshCount]);

  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api.get<Message[]>("/whatsapp/messages", { params: { ...(owner ? { owner } : {}), jid: selected.jid }, signal: controller.signal });
        if (!controller.signal.aborted) {
          setMessages(result.data);
          setMessageError("");
        }
      } catch (err) {
        if (!controller.signal.aborted && !axios.isCancel(err)) setMessageError(errorMessage(err));
      } finally { pending = false; }
    };
    void run(); const timer = setInterval(() => { if (document.visibilityState === "visible") void run(); }, 3000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selected, owner, refreshCount]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);

  // Debounced contact search — runs when user types ≥2 chars in the search box.
  useEffect(() => {
    if (query.length < 2) { setContactSuggestions([]); return; }
    const timer = setTimeout(async () => {
      try {
        const result = await api.get<Contact[]>("/whatsapp/contacts", {
          params: { q: query, ...(owner ? { owner } : {}) },
        });
        setContactSuggestions(result.data);
      } catch { setContactSuggestions([]); }
    }, 400);
    return () => clearTimeout(timer);
  }, [query, owner]);

  // Full saved-contact list for the Contacts tab (loaded only while that tab is open).
  useEffect(() => {
    if (view !== "contacts") return;
    const controller = new AbortController();
    setContactsLoaded(false);
    const run = async () => {
      try {
        const result = await api.get<Contact[]>("/whatsapp/contacts", { params: owner ? { owner } : {}, signal: controller.signal });
        if (!controller.signal.aborted) { setAllContacts(result.data); setContactsLoaded(true); }
      } catch { if (!controller.signal.aborted) setContactsLoaded(true); }
    };
    void run();
    const timer = setInterval(() => { if (document.visibilityState === "visible") void run(); }, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [view, owner, refreshCount]);

  const connect = async () => {
    setBusy(true); setError("");
    try { await api.post("/whatsapp/connect", { consent: true }); await refreshConnection(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    if (!window.confirm("Disconnect this WhatsApp account and delete its copied chats from the CRM? Messages on the phone will remain.")) return;
    setBusy(true); setError("");
    try {
      await api.delete("/whatsapp/connection", { params });
      setChats([]); setSelected(null); setMessages([]); setText(""); generation.current += 1;
      await refreshConnection();
    } catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const send = async () => {
    if (!selected || !text.trim() || sendLock.current || !own) return;
    sendLock.current = true; setSending(true); setError("");
    const version = generation.current;
    const jid = selected.jid; const value = text.trim();
    if (sendAttempt.current?.jid !== jid || sendAttempt.current.text !== value) sendAttempt.current = { jid, text: value, requestId: crypto.randomUUID() };
    try {
      await api.post("/whatsapp/messages", sendAttempt.current);
      sendAttempt.current = null;
      if (generation.current !== version) return;
      setText("");
      const result = await api.get<Message[]>("/whatsapp/messages", { params: { jid } });
      if (generation.current === version) setMessages(result.data);
    } catch (err) { if (generation.current === version) setError(errorMessage(err)); }
    finally { sendLock.current = false; setSending(false); }
  };
  const visibleError = error || connectionError || (chatError && `Could not load chats. ${chatError}`)
    || (selected && messageError && `Could not load messages. ${messageError}`);
  const qrValid = Boolean(connection.qr && connection.qrExpiresAt && connection.qrExpiresAt > clock);
  const canSend = own && connection.status === "connected" && selected && !selected.jid.endsWith("@g.us");

  return (
    // The dashboard supplies 1.5rem padding; offset 0.5rem for a 1rem page gutter.
    <div className="-m-2 space-y-4 text-slate-800 dark:text-slate-100">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><FaWhatsapp size={30} className="text-emerald-600" /><div><h1 className="text-2xl font-bold">WhatsApp</h1><p className="text-sm text-slate-500 dark:text-slate-400">Link your WhatsApp and keep customer conversations together.</p></div></div>
        <button onClick={() => { setError(""); setRefreshCount(count => count + 1); }} className="rounded-lg border border-slate-200 p-2 dark:border-slate-600" aria-label="Refresh WhatsApp"><RefreshCw size={18} /></button>
      </header>
      {visibleError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{visibleError}</div>}
      {overview?.admin && <section className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
        <label htmlFor="whatsapp-owner" className="text-sm font-semibold">Company connections</label>
        <select id="whatsapp-owner" value={owner} onChange={event => { generation.current += 1; setOwner(event.target.value); setChats([]); setChatsLoaded(false); setChatError(""); setMessageError(""); setSelected(null); setMessages([]); setText(""); }} className="max-w-full rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm dark:border-slate-600">
          <option value="">My WhatsApp</option>
          {overview.connections.filter(item => item.owner !== overview.currentUser).map(item => <option key={item.owner} value={item.owner}>{item.ownerName || `Agent …${item.owner?.slice(-6)}`} {item.phone ? `(+${item.phone})` : ""} · {statusLabel[item.status] || item.status}</option>)}
        </select>
        <p className="text-xs text-slate-500">You can view connected agents’ synced chats. Replies use your own WhatsApp.</p>
      </section>}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">{own ? "My WhatsApp" : "Agent WhatsApp"}{viewedConnection?.phone ? ` · +${viewedConnection.phone}` : ""}</h2><p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">{loading ? "Checking connection…" : statusLabel[viewedConnection?.status || "disconnected"] || viewedConnection?.status}</p></div>
          {(viewedConnection?.owner || connection.qr) && <button disabled={busy} onClick={() => void disconnect()} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"><Unplug size={16} />Disconnect</button>}
        </div>
        {own && connection.status !== "connected" && <div className="mt-5 grid gap-6 md:grid-cols-[300px_1fr]">
          <div className="flex min-h-64 items-center justify-center rounded-xl border border-slate-200 bg-white p-3 text-slate-500">
            {qrValid ? <Image unoptimized src={connection.qr!} alt="Scan with WhatsApp Linked devices to connect your account" width={280} height={280} /> : (busy || ["connecting", "reconnecting"].includes(connection.status)) ? <div className="flex items-center gap-2"><Loader2 className="animate-spin" size={20} />Preparing connection…</div> : <p className="px-6 text-center text-sm">Your QR code will appear here after you connect.</p>}
          </div>
          <div className="space-y-4 text-sm"><h3 className="text-lg font-semibold">Link WhatsApp with a QR code</h3><ol className="list-decimal space-y-2 pl-5"><li>Open WhatsApp on your phone.</li><li>Open Settings or the menu, then choose <strong>Linked devices</strong>.</li><li>Choose <strong>Link a device</strong> and scan this QR.</li></ol>
            <p className="text-slate-500 dark:text-slate-400">Personal WhatsApp and WhatsApp Business can be linked. Available history will sync after connection; some older messages may be unavailable.</p>
            <label className="flex items-start gap-2"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} className="mt-1" /><span>I agree to sync chats into Xonier CRM.</span></label>
            <button disabled={!consent || busy || loading || connection.status === "connecting" || connection.status === "reconnecting" || connection.status === "qr"} onClick={() => void connect()} className="rounded-lg bg-emerald-600 px-4 py-2.5 font-semibold text-white disabled:opacity-50">{busy ? "Connecting…" : "Connect WhatsApp"}</button>
            {connection.status === "qr" && <p className="text-xs text-slate-500">{qrValid ? "QR refreshes automatically. Scan only on your own phone." : "Waiting for the next QR. If it does not refresh, disconnect and try again."}</p>}
            {connection.error && <p className="text-red-600">{connection.error}</p>}
          </div>
        </div>}
      </section>
      <section className="grid h-[600px] overflow-hidden rounded-2xl border border-slate-200 bg-white md:grid-cols-[300px_1fr] dark:border-slate-700 dark:bg-slate-800">
        <aside className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-slate-200 dark:border-slate-700`}>
          <div className="mx-3 mt-3 grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1 text-sm font-medium dark:bg-slate-900">
            {(["chats", "contacts"] as const).map(tab => <button key={tab} type="button" onClick={() => setView(tab)} className={`rounded-md py-1.5 capitalize ${view === tab ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-500"}`}>{tab}</button>)}
          </div>
          <label className="m-3 flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900"><Search size={16} /><input aria-label={view === "contacts" ? "Search contacts" : "Search chats"} placeholder={view === "contacts" ? "Search contacts" : "Search chats"} value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none" /></label>
          {view === "contacts" ? <div className="flex-1 overflow-y-auto">{(() => {
            const q = query.trim().toLowerCase();
            const list = allContacts.filter(c => !q || `${c.name ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(q));
            if (!list.length) return <p className="p-5 text-center text-sm text-slate-500">{!contactsLoaded ? "Loading contacts…" : q ? "No matching contacts." : "No saved contacts synced yet."}</p>;
            let letter = "";
            return <>
              <p className="px-4 pb-1 text-xs text-slate-400">{list.length} contact{list.length === 1 ? "" : "s"}</p>
              {list.map(c => {
                const label = c.name || c.phone || c.jid.split("@")[0];
                const first = c.name ? (label[0] || "#").toUpperCase() : "#";
                const header = first !== letter ? (letter = first) : null;
                const found = chats.find(chat => chat.jid === c.jid || (c.phone && chat.jid === `${c.phone.slice(1)}@s.whatsapp.net`));
                const item: Chat = found || { jid: c.jid, name: label, phone: c.phone, timestamp: 0 };
                return <div key={c.jid}>
                  {header && <p className="sticky top-0 bg-slate-50 px-4 py-1 text-xs font-semibold text-emerald-700 dark:bg-slate-900 dark:text-emerald-300">{header}</p>}
                  <button onClick={() => { generation.current += 1; setSelected(item); setMessageError(""); setMessages([]); setText(""); }} className={`block w-full border-b border-slate-100 px-4 py-3 text-left dark:border-slate-700 ${selected?.jid === item.jid ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}>
                    <p className="truncate font-medium">{label}</p>
                    {c.phone && c.name && <p className="mt-0.5 text-xs text-slate-400">{c.phone}</p>}
                  </button>
                </div>;
              })}
            </>;
          })()}</div> : null}
          {view === "chats" && <div className="flex-1 overflow-y-auto">{(() => {
              const filtered = chats.filter(chat => !query || `${chat.name} ${chat.jid} ${chat.phone ?? ""}`.toLowerCase().includes(query.toLowerCase()));
              const extra = query.length >= 2 ? contactSuggestions.filter(c =>
                !filtered.some(chat => chat.jid === c.jid || (c.phone && chat.jid === `${c.phone.slice(1)}@s.whatsapp.net`))
              ) : [];
              const matchedChat = (c: Contact) => chats.find(chat => chat.jid === c.jid || (c.phone && chat.jid === `${c.phone.slice(1)}@s.whatsapp.net`));
              return (<>
                {filtered.map(chat => <button key={chat.jid} onClick={() => { generation.current += 1; setSelected(chat); setMessageError(""); setMessages([]); setText(""); }} className={`block w-full border-b border-slate-100 p-4 text-left dark:border-slate-700 ${selected?.jid === chat.jid ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}><div className="flex justify-between gap-2"><span className="truncate font-medium">{chat.name}</span><span className="shrink-0 text-xs text-slate-400">{time(chat.timestamp)}</span></div><p className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{chat.preview || chat.jid.split("@")[0]}</p></button>)}
                {extra.length > 0 && (<>
                  <p className="border-t border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700">Saved Contacts</p>
                  {extra.map(c => { const found = matchedChat(c); const item: Chat = found || { jid: c.jid, name: c.name || c.phone || c.jid.split("@")[0], phone: c.phone, timestamp: 0 }; return (
                    <button key={c.jid} onClick={() => { generation.current += 1; setSelected(item); setMessageError(""); setMessages([]); setText(""); }} className={`block w-full border-b border-slate-100 p-4 text-left dark:border-slate-700 ${selected?.jid === item.jid ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}><p className="truncate font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-400">{c.phone ?? ""}{!found ? " · Saved contact" : ""}</p></button>
                  ); })}
                </>)}
                {!filtered.length && !extra.length && <p className="p-5 text-center text-sm text-slate-500">{chatError ? "Chats could not load. Refresh to retry."
                  : !chatsLoaded ? "Loading chats…"
                  : viewedConnection?.status === "connected" ? "Chats are synching... New messages will appear here."
                  : "Connect WhatsApp to see synced chats."}</p>}
              </>);
            })()}</div>}
        </aside>
        <div className={`${selected ? "flex" : "hidden md:flex"} min-h-0 min-w-0 flex-col`}>
          {selected ? <><div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-700"><button onClick={() => { generation.current += 1; setSelected(null); }} className="text-sm text-emerald-600 md:hidden">Back</button><h3 className="truncate font-semibold">{selected.name}</h3>{!own && <span className="ml-auto text-xs text-slate-500">Admin view</span>}</div>
            <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/70 p-4 dark:bg-slate-900/40">{messages.map(message => <div key={message.messageId} className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}><div className={`max-w-[85%] rounded-xl px-4 py-2 ${message.fromMe ? "bg-emerald-100 dark:bg-emerald-900" : "border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800"}`}><p className="whitespace-pre-wrap break-words text-sm">{message.text || `[${message.type} — open on your phone]`}</p><p className="mt-1 text-right text-[10px] text-slate-500 dark:text-slate-400">{time(message.timestamp)}{message.fromMe ? ` · ${message.status === 0 ? "Failed" : message.status >= 4 ? "Read" : message.status >= 3 ? "Delivered" : message.status >= 2 ? "Sent" : "Pending"}` : ""}</p></div></div>)}<div ref={bottom} /></div>
            <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex items-center gap-2 border-t border-slate-200 p-3 dark:border-slate-700"><input aria-label="Message" maxLength={4096} disabled={!canSend || sending} value={text} onChange={event => setText(event.target.value)} placeholder={!own ? "Admin view: replies are sent by the account owner" : selected.jid.endsWith("@g.us") ? "Group conversations are read only" : connection.status !== "connected" ? "Reconnect WhatsApp to reply" : "Type a message"} className="min-w-0 flex-1 rounded-lg bg-slate-50 px-3 py-3 text-sm outline-none dark:bg-slate-900 disabled:opacity-60" /><button aria-label="Send message" disabled={!canSend || !text.trim() || sending} className="rounded-lg bg-emerald-600 p-3 text-white disabled:opacity-40">{sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}</button></form>
          </> : <div className="m-auto p-8 text-center text-slate-500"><FaWhatsapp size={48} className="mx-auto mb-4 text-emerald-500" /><p>Select a conversation to read messages.</p><p className="mt-2 text-xs">Recent synced chats and up to 100 messages per chat appear here.</p></div>}
        </div>
      </section>
      <p className="text-xs text-slate-500 dark:text-slate-400">This connection uses WhatsApp Linked devices. WhatsApp changes can require reconnecting, and unofficial clients can cause account restrictions. Media sending and downloads are not available yet.</p>
    </div>
  );
}
