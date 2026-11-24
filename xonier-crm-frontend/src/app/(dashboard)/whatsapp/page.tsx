"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { RootState } from "@/src/store";
import api from "@/src/lib/axios";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowLeft, Check, CheckCheck, Info, Loader2, MessageCircle, Phone, RefreshCw, Send, Unplug, Search, X } from "lucide-react";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

type Connection = { owner?: string; ownerName?: string; phone?: string; status: string; error?: string; qr?: string; qrExpiresAt?: number };
type Chat = { jid: string; name: string; preview?: string; timestamp: number; phone?: string | null; unreadCount?: number; profilePicUrl?: string | null };
type Contact = { jid: string; name: string | null; phone: string | null; profilePicUrl?: string | null };
type ContactProfile = { jid: string; name: string; phone: string | null; profilePicUrl?: string | null; about?: string | null };
type Message = { messageId: string; text: string; type: string; fromMe: boolean; timestamp: number; status: number };
type Overview = { admin: boolean; currentUser: string; connections: Connection[] };
const errorMessage = (error: unknown) => axios.isAxiosError(error)
  ? error.response?.data?.message || "WhatsApp service is unavailable. Please try again." : "Unable to complete this action.";
const time = (value: number) => value ? new Date(value * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
const statusLabel: Record<string, string> = { qr: "Scan QR", connecting: "Connecting…", connected: "Connected", reconnecting: "Reconnecting…", disconnected: "Disconnected", error: "Connection needs attention" };
const avatarColor = (value: string) => ["bg-emerald-100 text-emerald-800", "bg-teal-100 text-teal-800", "bg-amber-100 text-amber-800", "bg-sky-100 text-sky-800", "bg-violet-100 text-violet-800"][Array.from(value).reduce((sum, char) => sum + char.charCodeAt(0), 0) % 5];
function ChatAvatar({ name, src, size = "md" }: { name: string; src?: string | null; size?: "md" | "lg" | "profile" }) {
  const initials = name.replace(/^\+/, "").split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase() || "?";
  const dimensions = size === "profile" ? "h-36 w-36 text-4xl" : size === "lg" ? "h-12 w-12 text-sm" : "h-11 w-11 text-xs";
  return <span aria-label={`${name} profile photo`} className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${avatarColor(name)} ${dimensions}`}><span aria-hidden="true">{initials}</span>{src && <img key={src} src={src} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" onError={event => { event.currentTarget.style.display = "none"; }} />}</span>;
}

export default function WhatsAppPage() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  return <WhatsAppInbox key={userId || "anonymous"} />;
}

function WhatsAppInbox() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [connection, setConnection] = useState<Connection>({ status: "disconnected" });
  const [owner, setOwner] = useState("");
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileAbout, setProfileAbout] = useState<string | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
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
  const chatCache = useRef(new Map<string, Chat[]>());
  const contactCache = useRef(new Map<string, Contact[]>());
  const messageCache = useRef(new Map<string, Message[]>());
  const messageKey = (jid: string) => JSON.stringify([owner, jid]);
  const sendLock = useRef(false);
  const sendAttempt = useRef<{ jid: string; text: string; requestId: string } | null>(null);
  const generation = useRef(0);
  const openedLeadChat = useRef("");
  const bottom = useRef<HTMLDivElement>(null);
  const own = !owner || owner === overview?.currentUser;
  const viewedConnection = own ? connection : overview?.connections.find(item => item.owner === owner);
  const params = owner ? { owner } : {};

  useEffect(() => { setProfileOpen(false); setProfileAbout(null); setProfileError(""); }, [selected?.jid]);

  useEffect(() => {
    const phone = (searchParams.get("phone") || "").replace(/\D/g, "");
    if (!/^\d{7,15}$/.test(phone)) return;
    const key = `${phone}:${searchParams.get("name") || ""}`;
    if (openedLeadChat.current === key) return;
    openedLeadChat.current = key;
    generation.current += 1;
    setOwner("");
    setChats(chatCache.current.get("") ?? []);
    setChatsLoaded(chatCache.current.has(""));
    setAllContacts(contactCache.current.get("") ?? []);
    setContactsLoaded(contactCache.current.has(""));
    setContactSuggestions([]);
    setView("chats");
    setQuery("");
    setMessages([]);
    setText("");
    setMessageError("");
    setSelected({
      jid: `${phone}@s.whatsapp.net`,
      name: searchParams.get("name") || `+${phone}`,
      phone: `+${phone}`,
      timestamp: 0,
    });
  }, [searchParams]);

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
          chatCache.current.set(owner, result.data);
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
    const jid = selected?.jid;
    if (!jid) return;
    const controller = new AbortController();
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api.get<Message[]>("/whatsapp/messages", { params: { ...(owner ? { owner } : {}), jid }, signal: controller.signal });
        if (!controller.signal.aborted) {
          const key = JSON.stringify([owner, jid]);
          messageCache.current.delete(key);
          messageCache.current.set(key, result.data);
          if (messageCache.current.size > 20) {
            const oldest = messageCache.current.keys().next().value;
            if (oldest !== undefined) messageCache.current.delete(oldest);
          }
          setMessages(result.data);
          setMessageError("");
        }
      } catch (err) {
        if (!controller.signal.aborted && !axios.isCancel(err)) setMessageError(errorMessage(err));
      } finally { pending = false; }
    };
    void run(); const timer = setInterval(() => { if (document.visibilityState === "visible") void run(); }, 3000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [selected?.jid, owner, refreshCount]);

  useEffect(() => {
    if (!selected || !own) return;
    setChats(current => current.map(chat => chat.jid === selected.jid ? { ...chat, unreadCount: 0 } : chat));
    void api.post("/whatsapp/chats/read", { jid: selected.jid }).catch(() => {});
  }, [selected, own]);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [messages.length]);

  // Debounced contact search — runs when user types ≥2 chars in the search box.
  useEffect(() => {
    if (query.length < 2) { setContactSuggestions([]); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await api.get<Contact[]>("/whatsapp/contacts", {
          params: { q: query, ...(owner ? { owner } : {}) },
          signal: controller.signal,
        });
        if (!controller.signal.aborted) setContactSuggestions(result.data);
      } catch { if (!controller.signal.aborted) setContactSuggestions([]); }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, owner]);

  // Warm Contacts once Chats has loaded, then refresh while Contacts is visible.
  useEffect(() => {
    if (!chatsLoaded && view !== "contacts") return;
    const controller = new AbortController();
    let pending = false;
    const run = async () => {
      if (pending) return;
      pending = true;
      try {
        const result = await api.get<Contact[]>("/whatsapp/contacts", { params: owner ? { owner } : {}, signal: controller.signal });
        if (!controller.signal.aborted) { contactCache.current.set(owner, result.data); setAllContacts(result.data); setContactsLoaded(true); }
      } catch { if (!controller.signal.aborted) setContactsLoaded(true); }
      finally { pending = false; }
    };
    if (view === "contacts" || !contactCache.current.has(owner)) void run();
    const timer = setInterval(() => { if (view === "contacts" && document.visibilityState === "visible") void run(); }, 10000);
    return () => { controller.abort(); clearInterval(timer); };
  }, [view, owner, refreshCount, chatsLoaded]);

  const connect = async () => {
    setBusy(true); setError("");
    try { await api.post("/whatsapp/connect", { consent: true }); await refreshConnection(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const disconnect = async () => {
    const { isConfirmed } = await ConfirmPopup({
      title: "Disconnect WhatsApp?",
      text: "Disconnect this WhatsApp account and delete its copied chats from the CRM? Messages on the phone will remain.",
      btnTxt: "Disconnect",
      variant: "danger",
    });
    if (!isConfirmed) return;
    setBusy(true); setError("");
    try {
      await api.delete("/whatsapp/connection", { params });
      chatCache.current.clear(); contactCache.current.clear(); messageCache.current.clear();
      setAllContacts([]); setContactsLoaded(false);
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
      if (generation.current === version) {
        messageCache.current.set(messageKey(jid), result.data);
        setMessages(result.data);
      }
    } catch (err) { if (generation.current === version) setError(errorMessage(err)); }
    finally { sendLock.current = false; setSending(false); }
  };
  const openProfile = async () => {
    if (!selected) return;
    setProfileOpen(true); setProfileLoading(true); setProfileError(""); setProfileAbout(null);
    try {
      const result = await api.get<ContactProfile>("/whatsapp/profile", { params: { jid: selected.jid, ...(owner ? { owner } : {}) } });
      if (selected.jid === result.data.jid) {
        setProfileAbout(result.data.about || null);
        setSelected(current => current?.jid === result.data.jid ? { ...current, name: result.data.name || current.name, phone: result.data.phone || current.phone, profilePicUrl: result.data.profilePicUrl || current.profilePicUrl } : current);
      }
    } catch { setProfileError("About information could not be loaded."); }
    finally { setProfileLoading(false); }
  };
  const visibleError = error || connectionError || (chatError && `Could not load chats. ${chatError}`)
    || (selected && messageError && `Could not load messages. ${messageError}`);
  const qrValid = Boolean(connection.qr && connection.qrExpiresAt && connection.qrExpiresAt > clock);
  const canSend = own && connection.status === "connected" && selected && !selected.jid.endsWith("@g.us");

  return (
    // The dashboard supplies 1.5rem padding; offset 0.5rem for a 1rem page gutter.
    <div className="-m-2 space-y-3 text-[#111b21] dark:text-slate-100">
      <header className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800 sm:px-5">
        <div className="flex shrink-0 items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e7f8ef] text-[#008069] dark:bg-emerald-950"><FaWhatsapp size={24} /></span><div><h1 className="text-lg font-semibold tracking-tight">WhatsApp</h1><p className="text-[11px] text-slate-500 dark:text-slate-400">Customer conversations</p></div></div>
        {overview?.admin && <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2 border-l border-slate-200 pl-4 dark:border-slate-700 sm:pl-5">
          <label htmlFor="whatsapp-owner" className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">Company connections</label>
          <select id="whatsapp-owner" value={owner} onChange={event => { generation.current += 1; const nextOwner = event.target.value; setOwner(nextOwner); setChats(chatCache.current.get(nextOwner) ?? []); setChatsLoaded(chatCache.current.has(nextOwner)); setAllContacts(contactCache.current.get(nextOwner) ?? []); setContactsLoaded(contactCache.current.has(nextOwner)); setContactSuggestions([]); setChatError(""); setMessageError(""); setSelected(null); setMessages([]); setText(""); }} className="max-w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium dark:border-slate-600 dark:bg-slate-800">
            <option value="">My WhatsApp</option>
            {overview.connections.filter(item => item.owner !== overview.currentUser).map(item => <option key={item.owner} value={item.owner}>{item.ownerName || `Agent …${item.owner?.slice(-6)}`} {item.phone ? `(+${item.phone})` : ""} · {statusLabel[item.status] || item.status}</option>)}
          </select>
          <p className="min-w-[180px] flex-1 text-xs text-slate-500 dark:text-slate-400">View synced chats; replies use your connected WhatsApp.</p>
        </div>}
        <div className="ml-auto flex min-w-0 items-center gap-3 sm:border-l sm:border-slate-200 sm:pl-5 dark:sm:border-slate-700">
          <FaWhatsapp className="shrink-0 text-[#008069]" size={19} aria-hidden="true" />
          <div className="min-w-0"><div className="max-w-[240px] truncate text-xs font-semibold text-slate-800 dark:text-slate-100">{viewedConnection?.phone ? `+${viewedConnection.phone}` : loading ? "Checking WhatsApp" : own ? "WhatsApp not connected" : "Agent WhatsApp"}</div><div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400"><span className={`h-1.5 w-1.5 rounded-full ${viewedConnection?.status === "connected" ? "bg-[#00a884]" : "bg-amber-400"}`} />{loading ? "Checking…" : statusLabel[viewedConnection?.status || "disconnected"] || viewedConnection?.status}</div></div>
        </div>
        {(viewedConnection?.owner || connection.qr) && <button disabled={busy} onClick={() => void disconnect()} className="flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/30" aria-label="Disconnect WhatsApp"><Unplug size={15} /><span className="hidden sm:inline">Disconnect</span></button>}
        <button onClick={() => { setError(""); setRefreshCount(count => count + 1); }} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700" aria-label="Refresh WhatsApp"><RefreshCw size={17} /></button>
      </header>
      {visibleError && <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{visibleError}</div>}
      <section>
        {own && connection.phone && ["connecting", "reconnecting"].includes(connection.status) &&
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
            <Loader2 className="animate-spin" size={20} /> Restoring your linked WhatsApp session automatically. Your synced chats remain available while it reconnects.
          </div>}
        {!loading && !connectionError && own && connection.status !== "connected" && !(connection.phone && ["connecting", "reconnecting"].includes(connection.status)) && <div className="mt-5 grid gap-6 md:grid-cols-[300px_1fr]">
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
      <section className="grid h-[min(76vh,850px)] min-h-[560px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_32px_rgba(15,23,42,0.06)] md:grid-cols-[minmax(320px,36%)_minmax(0,1fr)] dark:border-slate-700 dark:bg-slate-800">
        <aside className={`${selected ? "hidden md:flex" : "flex"} min-h-0 flex-col border-r border-[#e9edef] bg-white dark:border-slate-700 dark:bg-slate-800`}>
          <div className="flex items-center justify-between px-5 pb-2 pt-5"><h2 className="text-xl font-bold tracking-tight">Chats</h2><span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f0f2f5] text-[#54656f] dark:bg-slate-700 dark:text-slate-300"><MessageCircle size={18} /></span></div>
          <div className="mx-4 mb-2 flex items-center gap-1 text-sm font-medium">
            {(["chats", "contacts"] as const).map(tab => <button key={tab} type="button" onClick={() => setView(tab)} className={`rounded-full px-4 py-1.5 capitalize transition-colors ${view === tab ? "bg-[#e7fce3] text-[#008069] dark:bg-emerald-950 dark:text-emerald-300" : "text-[#54656f] hover:bg-[#f0f2f5] dark:text-slate-400 dark:hover:bg-slate-700"}`}>{tab}</button>)}
          </div>
          <label className="mx-4 mb-3 flex items-center gap-3 rounded-lg bg-[#f0f2f5] px-4 py-2.5 text-[#54656f] dark:bg-slate-900 dark:text-slate-400"><Search size={17} /><input aria-label={view === "contacts" ? "Search contacts" : "Search chats"} placeholder={view === "contacts" ? "Search contacts" : "Search chats"} value={query} onChange={event => setQuery(event.target.value)} className="w-full bg-transparent text-sm text-[#111b21] outline-none placeholder:text-[#667781] dark:text-white" /></label>
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
                const item: Chat = found ? { ...found, profilePicUrl: found.profilePicUrl || c.profilePicUrl } : { jid: c.jid, name: label, phone: c.phone, timestamp: 0, profilePicUrl: c.profilePicUrl };
                return <div key={c.jid}>
                  {header && <p className="sticky top-0 bg-slate-50 px-4 py-1 text-xs font-semibold text-emerald-700 dark:bg-slate-900 dark:text-emerald-300">{header}</p>}
                  <button onClick={() => { generation.current += 1; setSelected(item); setMessageError(""); setMessages(messageCache.current.get(messageKey(item.jid)) ?? []); setText(""); }} className={`flex w-full items-center gap-3 border-b border-slate-100 px-4 py-3 text-left dark:border-slate-700 ${selected?.jid === item.jid ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}><ChatAvatar name={label} src={c.profilePicUrl} /><div className="min-w-0">
                    <p className="truncate font-medium">{label}</p>
                    {c.phone && c.name && <p className="mt-0.5 text-xs text-slate-400">{c.phone}</p>}
                  </div></button>
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
                {filtered.map(chat => <button key={chat.jid} onClick={() => { generation.current += 1; setSelected(chat); setMessageError(""); setMessages(messageCache.current.get(messageKey(chat.jid)) ?? []); setText(""); }} className={`flex w-full items-center gap-3 px-4 text-left transition-colors ${selected?.jid === chat.jid ? "bg-[#f0f2f5] dark:bg-slate-700" : "hover:bg-[#f5f6f6] dark:hover:bg-slate-700/60"}`}><ChatAvatar name={chat.name} src={chat.profilePicUrl} /><div className="min-w-0 flex-1 border-b border-[#f0f2f5] py-3.5 dark:border-slate-700"><div className="flex items-baseline justify-between gap-2"><span className={`truncate text-[15px] ${chat.unreadCount ? "font-semibold" : "font-medium"}`}>{chat.name}</span><span className={`shrink-0 text-[11px] ${chat.unreadCount ? "font-semibold text-[#00a884]" : "text-[#667781] dark:text-slate-400"}`}>{time(chat.timestamp)}</span></div><div className="mt-1 flex items-center justify-between gap-2"><p className={`truncate text-[13px] ${chat.unreadCount ? "text-[#3b4a54] dark:text-slate-200" : "text-[#667781] dark:text-slate-400"}`}>{chat.preview || chat.jid.split("@")[0]}</p>{Boolean(chat.unreadCount) && <span aria-label={`${chat.unreadCount} unread messages`} className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-semibold text-white">{chat.unreadCount! > 99 ? "99+" : chat.unreadCount}</span>}</div></div></button>)}
                {extra.length > 0 && (<>
                  <p className="border-t border-slate-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:border-slate-700">Saved Contacts</p>
                  {extra.map(c => { const found = matchedChat(c); const item: Chat = found || { jid: c.jid, name: c.name || c.phone || c.jid.split("@")[0], phone: c.phone, timestamp: 0 }; return (
                    <button key={c.jid} onClick={() => { generation.current += 1; setSelected(item); setMessageError(""); setMessages(messageCache.current.get(messageKey(item.jid)) ?? []); setText(""); }} className={`flex w-full items-center gap-3 border-b border-slate-100 p-4 text-left dark:border-slate-700 ${selected?.jid === item.jid ? "bg-emerald-50 dark:bg-emerald-950/40" : "hover:bg-slate-50 dark:hover:bg-slate-700"}`}><ChatAvatar name={item.name} src={item.profilePicUrl || c.profilePicUrl} /><div className="min-w-0"><p className="truncate font-medium">{item.name}</p><p className="mt-1 text-xs text-slate-400">{c.phone ?? ""}{!found ? " · Saved contact" : ""}</p></div></button>
                  ); })}
                </>)}
                {!filtered.length && !extra.length && <p className="p-5 text-center text-sm text-slate-500">{chatError ? "Chats could not load. Refresh to retry."
                  : !chatsLoaded ? "Loading chats…"
                  : viewedConnection?.status === "connected" ? "Chats are synching... New messages will appear here."
                  : "Connect WhatsApp to see synced chats."}</p>}
              </>);
            })()}</div>}
        </aside>
        <div className={`${selected ? "flex" : "hidden md:flex"} relative min-h-0 min-w-0 flex-col`}>
          {profileOpen && selected ? <div className="absolute inset-0 z-20 flex flex-col bg-white dark:bg-slate-900">
            <div className="flex h-[60px] shrink-0 items-center gap-3 border-b border-slate-200 px-5 dark:border-slate-700"><button type="button" onClick={() => setProfileOpen(false)} aria-label="Close contact profile" className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"><X size={19} /></button><div><p className="text-sm font-semibold">Contact info</p><p className="text-xs text-slate-500 dark:text-slate-400">WhatsApp profile</p></div></div>
            <div className="flex-1 overflow-y-auto bg-[#f7f9fa] px-5 py-8 dark:bg-slate-950">
              <div className="mx-auto flex max-w-lg flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
                <ChatAvatar name={selected.name} src={selected.profilePicUrl} size="profile" />
                <h2 className="mt-5 max-w-full break-words text-2xl font-semibold tracking-tight">{selected.name}</h2>
                <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400"><Phone size={14} />{selected.phone || selected.jid.split("@")[0]}</p>
              </div>
              <div className="mx-auto mt-4 max-w-lg rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
                <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#008069]"><Info size={15} />About</div>
                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">{profileLoading ? "Loading profile…" : profileError || profileAbout || "No about information available."}</p>
              </div>
            </div>
          </div> : selected ? <><div className="flex h-[72px] shrink-0 items-center gap-3 border-b border-[#e9edef] bg-[#f0f2f5] px-4 dark:border-slate-700 dark:bg-slate-800"><button onClick={() => { generation.current += 1; setSelected(null); }} className="rounded-full p-1 text-[#54656f] md:hidden" aria-label="Back to chats"><ArrowLeft size={20} /></button><button type="button" onClick={() => void openProfile()} title="View contact profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left transition-colors hover:bg-white/60 dark:hover:bg-slate-700"><ChatAvatar name={selected.name} src={selected.profilePicUrl} /><span className="min-w-0"><span className="block truncate text-[15px] font-semibold">{selected.name}</span><span className="block truncate text-xs text-[#667781] dark:text-slate-400">{selected.phone || (selected.jid.endsWith("@g.us") ? "Group conversation" : selected.jid.split("@")[0])}</span></span></button>{!own && <span className="text-xs text-slate-500">Admin view</span>}</div>
            <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-4 py-5 sm:px-8 dark:bg-[#111b21]" style={{ backgroundImage: "radial-gradient(rgba(120,110,95,0.08) 0.7px, transparent 0.7px)", backgroundSize: "20px 20px" }}>{messages.map(message => <div key={message.messageId} className={`flex ${message.fromMe ? "justify-end" : "justify-start"}`}><div className={`max-w-[88%] rounded-lg px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.08)] sm:max-w-[72%] ${message.fromMe ? "rounded-tr-sm bg-[#d9fdd3] dark:bg-[#005c4b]" : "rounded-tl-sm bg-white dark:bg-[#202c33]"}`}><p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">{message.text || `[${message.type} — open on your phone]`}</p><div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781] dark:text-slate-400"><span>{time(message.timestamp)}</span>{message.fromMe && (message.status >= 3 ? <CheckCheck size={14} className={message.status >= 4 ? "text-[#53bdeb]" : ""} /> : message.status >= 2 ? <Check size={14} /> : <span>{message.status === 0 ? "Failed" : "Pending"}</span>)}</div></div></div>)}<div ref={bottom} /></div>
            <form onSubmit={event => { event.preventDefault(); void send(); }} className="flex shrink-0 items-center gap-3 bg-[#f0f2f5] px-3 py-3 dark:bg-[#202c33]"><input aria-label="Message" maxLength={4096} disabled={!canSend || sending} value={text} onChange={event => setText(event.target.value)} placeholder={!own ? "Admin view: replies are sent by the account owner" : selected.jid.endsWith("@g.us") ? "Group conversations are read only" : connection.status !== "connected" ? "Reconnect WhatsApp to reply" : "Type a message"} className="min-w-0 flex-1 rounded-lg bg-white px-4 py-3 text-[14px] outline-none placeholder:text-[#667781] focus:ring-1 focus:ring-[#00a884] dark:bg-[#2a3942] disabled:opacity-60" /><button aria-label="Send message" disabled={!canSend || !text.trim() || sending} className="rounded-full p-2.5 text-[#00a884] transition-colors hover:bg-[#e1e7e9] disabled:opacity-40 dark:hover:bg-slate-700">{sending ? <Loader2 size={21} className="animate-spin" /> : <Send size={21} />}</button></form>
          </> : <div className="flex h-full flex-col items-center justify-center border-b-[5px] border-[#25d366] bg-[#f8faf9] p-8 text-center dark:bg-[#111b21]"><span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#e7f8ef] text-[#008069] dark:bg-emerald-950"><FaWhatsapp size={51} /></span><h2 className="text-2xl font-light text-[#41525d] dark:text-slate-200">WhatsApp for your team</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[#667781] dark:text-slate-400">Select a chat to see your synced conversation and reply from your connected number.</p><p className="mt-8 text-xs text-[#8696a0]">Recent synced chats · Up to 100 messages per conversation</p></div>}
        </div>
      </section>
      <p className="text-xs text-slate-500 dark:text-slate-400">This connection uses WhatsApp Linked devices. WhatsApp changes can require reconnecting, and unofficial clients can cause account restrictions. Media sending and downloads are not available yet.</p>
    </div>
  );
}
