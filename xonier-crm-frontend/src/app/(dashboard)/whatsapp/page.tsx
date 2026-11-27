"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Image from "next/image";
import { useSelector } from "react-redux";
import { useSearchParams } from "next/navigation";
import { RootState } from "@/src/store";
import api from "@/src/lib/axios";
import { FaWhatsapp } from "react-icons/fa";
import { ArrowLeft, Check, CheckCheck, Download, FileText, Film, Image as ImageIcon, Info, Loader2, MessageCircle, Music, Paperclip, Pencil, Phone, RefreshCw, Send, Unplug, Search, X } from "lucide-react";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";

type Connection = { owner?: string; ownerName?: string; phone?: string; status: string; error?: string; qr?: string; qrExpiresAt?: number };
type Chat = { jid: string; name: string; preview?: string; timestamp: number; phone?: string | null; unreadCount?: number; profilePicUrl?: string | null };
type Contact = { jid: string; name: string | null; phone: string | null; profilePicUrl?: string | null };
type ContactProfile = { jid: string; name: string; phone: string | null; profilePicUrl?: string | null; about?: string | null };
type Message = {
  messageId: string;
  text: string;
  type: string;
  fromMe: boolean;
  timestamp: number;
  status: number;
  edited?: boolean;
  editedAt?: number;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  mediaUrl?: string | null;
};
type PendingAttachment = {
  data: string;
  dataUrl: string;
  mimeType: string;
  fileName: string;
  fileSize: number;
  kind: "image" | "video" | "audio" | "document";
};
type Overview = { admin: boolean; currentUser: string; connections: Connection[] };
const formatBytes = (bytes?: number | null) => {
  if (!bytes || bytes <= 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
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
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const [consent, setConsent] = useState(false);
  const [clock, setClock] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const chatCache = useRef(new Map<string, Chat[]>());
  const contactCache = useRef(new Map<string, Contact[]>());
  const messageCache = useRef(new Map<string, Message[]>());
  const messageKey = (jid: string) => JSON.stringify([owner, jid]);
  const sendLock = useRef(false);
  const sendAttempt = useRef<{ jid: string; signature: string; requestId: string } | null>(null);
  const generation = useRef(0);
  const openedLeadChat = useRef("");
  const bottom = useRef<HTMLDivElement>(null);
  const own = !owner || owner === overview?.currentUser;
  const viewedConnection = own ? connection : overview?.connections.find(item => item.owner === owner);
  const params = owner ? { owner } : {};

  useEffect(() => {
    setProfileOpen(false);
    setProfileAbout(null);
    setProfileError("");
    setAttachment(null);
    setAttachMenuOpen(false);
    setEditingMessage(null);
  }, [selected?.jid]);

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
  const handleFileSelect = (
    event: React.ChangeEvent<HTMLInputElement>,
    forcedKind?: "document" | "audio"
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setAttachMenuOpen(false);
    if (!file) return;
    if (file.size > 16 * 1024 * 1024) {
      setError("File size exceeds 16 MB limit. Please choose a smaller file.");
      return;
    }
    const mimeType = file.type || "application/octet-stream";
    let kind: PendingAttachment["kind"] = "document";
    if (forcedKind) {
      kind = forcedKind;
    } else if (mimeType.startsWith("image/")) {
      kind = "image";
    } else if (mimeType.startsWith("video/")) {
      kind = "video";
    } else if (mimeType.startsWith("audio/")) {
      kind = "audio";
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
      if (!base64) {
        setError("Could not read the selected file.");
        return;
      }
      setEditingMessage(null);
      setAttachment({
        data: base64,
        dataUrl,
        mimeType,
        fileName: file.name,
        fileSize: file.size,
        kind,
      });
      setError("");
      requestAnimationFrame(() => messageInputRef.current?.focus());
    };
    reader.onerror = () => setError("Could not read the selected file.");
    reader.readAsDataURL(file);
  };

  const startEdit = (message: Message) => {
    if (!message.fromMe || !canSend) return;
    setAttachment(null);
    setAttachMenuOpen(false);
    setEditingMessage(message);
    setText(message.text || "");
    setError("");
    requestAnimationFrame(() => messageInputRef.current?.focus());
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setText("");
  };

  const send = async () => {
    if (!selected || sendLock.current || !own) return;
    const jid = selected.jid;
    const value = text.trim();

    // Edit existing sent message
    if (editingMessage) {
      if (!value) return;
      if (value === editingMessage.text) {
        cancelEdit();
        return;
      }
      sendLock.current = true;
      setSending(true);
      setError("");
      const version = generation.current;
      const targetMsgId = editingMessage.messageId;
      try {
        await api.patch("/whatsapp/messages", {
          jid,
          messageId: targetMsgId,
          text: value,
        });
        if (generation.current !== version) return;
        setEditingMessage(null);
        setText("");
        setMessages((prev) => {
          const updated = prev.map((m) =>
            m.messageId === targetMsgId
              ? { ...m, text: value, edited: true, editedAt: Math.floor(Date.now() / 1000) }
              : m
          );
          messageCache.current.set(messageKey(jid), updated);
          return updated;
        });
      } catch (err) {
        if (generation.current === version) setError(errorMessage(err));
      } finally {
        sendLock.current = false;
        setSending(false);
      }
      return;
    }

    // Send new text or media message
    if (!value && !attachment) return;
    sendLock.current = true; setSending(true); setError("");
    const version = generation.current;
    const signature = attachment ? `${attachment.kind}:${attachment.fileName}:${value}` : value;
    if (sendAttempt.current?.jid !== jid || sendAttempt.current.signature !== signature) {
      sendAttempt.current = { jid, signature, requestId: crypto.randomUUID() };
    }
    try {
      await api.post("/whatsapp/messages", {
        jid,
        text: value,
        requestId: sendAttempt.current.requestId,
        ...(attachment
          ? {
              media: {
                data: attachment.data,
                mimeType: attachment.mimeType,
                fileName: attachment.fileName,
                fileSize: attachment.fileSize,
                kind: attachment.kind,
              },
            }
          : {}),
      });
      sendAttempt.current = null;
      if (generation.current !== version) return;
      setText("");
      setAttachment(null);
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
            <div className="flex-1 space-y-2 overflow-y-auto bg-[#efeae2] px-4 py-5 sm:px-8 dark:bg-[#111b21]" style={{ backgroundImage: "radial-gradient(rgba(120,110,95,0.08) 0.7px, transparent 0.7px)", backgroundSize: "20px 20px" }}>
              {messages.map(message => {
                const canEditThis = canSend && message.fromMe && (message.type === "text" || Boolean(message.text));
                return (
                  <div key={message.messageId} className={`group flex ${message.fromMe ? "justify-end" : "justify-start"}`}>
                    <div className={`relative max-w-[88%] rounded-lg px-3 py-2 shadow-[0_1px_1px_rgba(0,0,0,0.08)] sm:max-w-[72%] ${message.fromMe ? "rounded-tr-sm bg-[#d9fdd3] dark:bg-[#005c4b]" : "rounded-tl-sm bg-white dark:bg-[#202c33]"}`}>
                      {canEditThis && (
                        <button
                          type="button"
                          onClick={() => startEdit(message)}
                          title="Edit message"
                          aria-label="Edit message"
                          className="absolute -left-8 top-1.5 hidden rounded-full bg-white/90 p-1.5 text-slate-600 shadow-xs transition hover:bg-white hover:text-[#008069] group-hover:inline-flex dark:bg-slate-800 dark:text-slate-300 dark:hover:text-emerald-400"
                        >
                          <Pencil size={13} />
                        </button>
                      )}

                      {/* Media / File Attachment Rendering */}
                      {message.type === "image" && (
                        <div className="mb-1.5 overflow-hidden rounded-lg">
                          {message.mediaUrl ? (
                            <div className="relative">
                              <img
                                src={message.mediaUrl}
                                alt={message.fileName || "Image attachment"}
                                className="max-h-64 w-auto rounded-lg object-cover"
                              />
                              <a
                                href={message.mediaUrl}
                                download={message.fileName || "whatsapp-image"}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-[#008069] hover:underline dark:text-emerald-300"
                              >
                                <Download size={12} /> Download{message.fileSize ? ` (${formatBytes(message.fileSize)})` : ""}
                              </a>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
                              <ImageIcon size={16} className="shrink-0 text-[#008069] dark:text-emerald-300" />
                              <span className="truncate">{message.fileName || "Image"}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {message.type === "video" && (
                        <div className="mb-1.5 overflow-hidden rounded-lg">
                          {message.mediaUrl ? (
                            <video controls src={message.mediaUrl} className="max-h-64 rounded-lg" />
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
                              <Film size={16} className="shrink-0 text-[#008069] dark:text-emerald-300" />
                              <span className="truncate">{message.fileName || "Video"}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {message.type === "audio" && (
                        <div className="mb-1.5">
                          {message.mediaUrl ? (
                            <audio controls src={message.mediaUrl} className="h-9 max-w-[240px]" />
                          ) : (
                            <div className="flex items-center gap-2 rounded-lg bg-black/5 px-3 py-2 text-xs dark:bg-white/10">
                              <Music size={16} className="shrink-0 text-[#008069] dark:text-emerald-300" />
                              <span className="truncate">{message.fileName || "Audio message"}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {message.type === "document" && (
                        <div className="mb-1.5 flex items-center justify-between gap-3 rounded-lg bg-black/5 px-3 py-2.5 dark:bg-white/10">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#008069]/15 text-[#008069] dark:bg-emerald-500/20 dark:text-emerald-300">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-semibold">
                                {message.fileName || "Document"}
                              </p>
                              <p className="text-[10px] text-[#667781] dark:text-slate-400">
                                {[formatBytes(message.fileSize), message.mimeType?.split("/")[1]?.toUpperCase()].filter(Boolean).join(" · ") || "File"}
                              </p>
                            </div>
                          </div>
                          {message.mediaUrl && (
                            <a
                              href={message.mediaUrl}
                              download={message.fileName || "document"}
                              title="Download file"
                              className="rounded-lg bg-white/80 p-1.5 text-[#008069] transition hover:bg-white dark:bg-slate-800 dark:text-emerald-300"
                            >
                              <Download size={15} />
                            </a>
                          )}
                        </div>
                      )}

                      {(message.text || message.type === "text" || message.type === "unsupported") && (
                        <p className="whitespace-pre-wrap break-words text-[14px] leading-[1.45]">
                          {message.text || (message.type === "text" ? "" : `[${message.type} — open on your phone]`)}
                        </p>
                      )}

                      <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-[#667781] dark:text-slate-400">
                        {message.edited && <span className="italic">Edited ·</span>}
                        <span>{time(message.timestamp)}</span>
                        {message.fromMe && canEditThis && (
                          <button
                            type="button"
                            onClick={() => startEdit(message)}
                            className="ml-1 inline-flex items-center gap-0.5 text-[10px] font-medium text-[#008069] opacity-75 hover:opacity-100 hover:underline dark:text-emerald-300 sm:hidden"
                          >
                            Edit
                          </button>
                        )}
                        {message.fromMe && (message.status >= 3 ? <CheckCheck size={14} className={message.status >= 4 ? "text-[#53bdeb]" : ""} /> : message.status >= 2 ? <Check size={14} /> : <span>{message.status === 0 ? "Failed" : "Pending"}</span>)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottom} />
            </div>

            {/* Editing Banner */}
            {editingMessage && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-emerald-50/90 px-4 py-2 text-xs dark:border-slate-700 dark:bg-emerald-950/60">
                <div className="flex min-w-0 items-center gap-2">
                  <Pencil size={14} className="shrink-0 text-[#008069] dark:text-emerald-400" />
                  <div className="min-w-0">
                    <p className="font-semibold text-[#008069] dark:text-emerald-300">Editing message</p>
                    <p className="truncate text-slate-600 dark:text-slate-300">{editingMessage.text}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={cancelEdit}
                  aria-label="Cancel editing"
                  className="rounded-full p-1 text-slate-500 hover:bg-black/5 dark:text-slate-300 dark:hover:bg-white/10"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Selected Attachment Preview Bar */}
            {attachment && (
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
                <div className="flex min-w-0 items-center gap-3">
                  {attachment.kind === "image" ? (
                    <img
                      src={attachment.dataUrl}
                      alt={attachment.fileName}
                      className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover dark:border-slate-700"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#e7f8ef] text-[#008069] dark:bg-emerald-950 dark:text-emerald-300">
                      {attachment.kind === "video" ? (
                        <Film size={20} />
                      ) : attachment.kind === "audio" ? (
                        <Music size={20} />
                      ) : (
                        <FileText size={20} />
                      )}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold">{attachment.fileName}</p>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{formatBytes(attachment.fileSize)}</span>
                      <span>·</span>
                      <span className="capitalize">{attachment.kind}</span>
                      {(attachment.mimeType.startsWith("image/") || attachment.mimeType.startsWith("video/")) && (
                        <button
                          type="button"
                          onClick={() =>
                            setAttachment((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    kind:
                                      prev.kind === "document"
                                        ? prev.mimeType.startsWith("image/")
                                          ? "image"
                                          : "video"
                                        : "document",
                                  }
                                : null
                            )
                          }
                          className="font-medium text-[#008069] hover:underline dark:text-emerald-400"
                        >
                          {attachment.kind === "document" ? "Send as media" : "Send as document"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAttachment(null)}
                  aria-label="Remove attachment"
                  className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <form onSubmit={event => { event.preventDefault(); void send(); }} className="relative flex shrink-0 items-center gap-2 bg-[#f0f2f5] px-3 py-3 dark:bg-[#202c33]">
              {/* Hidden file inputs */}
              <input
                ref={mediaInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e)}
              />
              <input
                ref={docInputRef}
                type="file"
                accept="*/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "document")}
              />
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleFileSelect(e, "audio")}
              />

              {/* Attachment Menu Button */}
              <div className="relative">
                <button
                  type="button"
                  disabled={!canSend || sending || Boolean(editingMessage)}
                  onClick={() => setAttachMenuOpen((open) => !open)}
                  aria-label="Attach media or file"
                  title="Attach media or file"
                  className="rounded-full p-2.5 text-[#54656f] transition-colors hover:bg-[#e1e7e9] disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-700"
                >
                  <Paperclip size={20} />
                </button>

                {attachMenuOpen && (
                  <div className="absolute bottom-13 left-0 z-30 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => mediaInputRef.current?.click()}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <ImageIcon size={16} className="text-emerald-600" />
                      Photos &amp; Videos
                    </button>
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <FileText size={16} className="text-indigo-600" />
                      Document / File
                    </button>
                    <button
                      type="button"
                      onClick={() => audioInputRef.current?.click()}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      <Music size={16} className="text-amber-600" />
                      Audio
                    </button>
                  </div>
                )}
              </div>

              <textarea
                ref={messageInputRef}
                aria-label="Message"
                rows={1}
                maxLength={4096}
                disabled={!canSend || sending}
                value={text}
                onChange={event => {
                  setText(event.target.value);
                  const el = event.target;
                  el.style.height = "auto";
                  el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  } else if (event.key === "Escape" && editingMessage) {
                    cancelEdit();
                  }
                }}
                placeholder={
                  !own
                    ? "Admin view: replies are sent by the account owner"
                    : selected.jid.endsWith("@g.us")
                    ? "Group conversations are read only"
                    : connection.status !== "connected"
                    ? "Reconnect WhatsApp to reply"
                    : editingMessage
                    ? "Edit your message…"
                    : attachment
                    ? "Add a caption (optional)…"
                    : "Type a message"
                }
                className="min-w-0 flex-1 resize-none overflow-y-auto rounded-lg bg-white px-4 py-3 text-[14px] leading-[1.4] outline-none placeholder:text-[#667781] focus:ring-1 focus:ring-[#00a884] dark:bg-[#2a3942] disabled:opacity-60 max-h-32"
              />
              <button
                aria-label={editingMessage ? "Save edited message" : "Send message"}
                disabled={!canSend || (!text.trim() && !attachment) || sending}
                className="rounded-full p-2.5 text-[#00a884] transition-colors hover:bg-[#e1e7e9] disabled:opacity-40 dark:hover:bg-slate-700"
              >
                {sending ? (
                  <Loader2 size={21} className="animate-spin" />
                ) : editingMessage ? (
                  <Check size={21} />
                ) : (
                  <Send size={21} />
                )}
              </button>
            </form>
          </> : <div className="flex h-full flex-col items-center justify-center border-b-[5px] border-[#25d366] bg-[#f8faf9] p-8 text-center dark:bg-[#111b21]"><span className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-[#e7f8ef] text-[#008069] dark:bg-emerald-950"><FaWhatsapp size={51} /></span><h2 className="text-2xl font-light text-[#41525d] dark:text-slate-200">WhatsApp for your team</h2><p className="mt-3 max-w-sm text-sm leading-6 text-[#667781] dark:text-slate-400">Select a chat to see your synced conversation and reply from your connected number.</p><p className="mt-8 text-xs text-[#8696a0]">Recent synced chats · Up to 100 messages per conversation</p></div>}
        </div>
      </section>
      <p className="text-xs text-slate-500 dark:text-slate-400">This connection uses WhatsApp Linked devices. WhatsApp changes can require reconnecting, and unofficial clients can cause account restrictions.</p>
    </div>
  );
}
