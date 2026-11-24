"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "axios";
import { ArrowLeft, BadgeCheck, ChevronLeft, ChevronRight, Inbox, Mail, Paperclip, Loader2, PenLine, RefreshCw, Reply, Search, Send, Unplug, X } from "lucide-react";
import api from "@/src/lib/axios";
import { RootState } from "@/src/store";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import EmailBody from "./EmailBody";

type Connection = { provider?: "google" | "microsoft"; providers: { google: boolean; microsoft: boolean }; configured: boolean; connected: boolean; inboxGranted: boolean; accountEmail?: string; needsReconnect: boolean; canViewCompany: boolean };
type History = { id: string; from_email: string; to_emails: string[]; cc_emails?: string[]; subject: string; text_body: string; status: string; provider: string; gmailOutcome: string; created_at: string; error_message?: string; attachments?: { name: string; size: number }[] };
const splitEmails = (value: string) => value.split(/[,;]+/).map(item => item.trim()).filter(Boolean);
const errorMessage = (error: unknown) => axios.isAxiosError(error) && typeof error.response?.data?.message === "string" ? error.response.data.message : "Unable to complete this email request. Please try again.";

export default function MailPage() {
  const userId = useSelector((state: RootState) => state.auth.user?._id);
  return <Suspense fallback={<p className="p-4">Loading email…</p>}><MailWorkspace key={userId || "anonymous"} /></Suspense>;
}

function MailWorkspace() {
  const search = useSearchParams();
  const { hasPermission } = usePermissions();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [mailView, setMailView] = useState<"mailbox" | "history">("mailbox");
  const [mailboxRevision, setMailboxRevision] = useState(0);
  const [historyByScope, setHistoryByScope] = useState<{ personal?: History[]; company?: History[] }>({});
  const [company, setCompany] = useState(false);
  const canViewCompanyHistory = connection?.canViewCompany && hasPermission(PERMISSIONS.readEmailLog);
  const history = company && !canViewCompanyHistory ? undefined : historyByScope[company ? "company" : "personal"];
  const [selected, setSelected] = useState<History | null>(null);
  const [to, setTo] = useState(() => search.get("to") || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [showCopies, setShowCopies] = useState(false);
  const [composeOpen, setComposeOpen] = useState(() => Boolean(search.get("to")));
  const [files, setFiles] = useState<File[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [sending, setSending] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const popup = useRef<Window | null>(null);
  const popupTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendLock = useRef(false);
  const attempt = useRef<{ key: string; requestId: string } | null>(null);
  const composerHeading = useRef<HTMLHeadingElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api").origin;

  useEffect(() => {
    if (composeOpen) composerHeading.current?.focus();
  }, [composeOpen]);

  useEffect(() => {
    if (!composeOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !sending) setComposeOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [composeOpen, sending]);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    await Promise.all([
      api.get<Connection>("/mail/connection", { signal }).then(({ data }) => {
        if (!signal?.aborted) setConnection(data);
      }),
      api.get<History[]>("/mail/outbox", { params: { company }, signal }).then(({ data }) => {
        if (!signal?.aborted) setHistoryByScope(current => ({ ...current, [company ? "company" : "personal"]: data }));
      }),
    ]);
  }, [company]);

  useEffect(() => {
    const controller = new AbortController();
    const run = async () => {
      try { await refresh(controller.signal); }
      catch (err) { if (!controller.signal.aborted) setError(errorMessage(err)); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    };
    void run();
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== apiOrigin || event.source !== popup.current || !["xonier:mail", "xonier:gmail"].includes(event.data?.type)) return;
      if (popupTimer.current) clearInterval(popupTimer.current);
      popup.current?.close(); popup.current = null; setConnecting(false);
      if (event.data.result === "connected") { setNotice("Email connected."); setError(""); }
      else setError(event.data.result === "denied" ? "Email access was cancelled. Connect again when ready." : "Email could not connect. Check the provider app setup and allow the send-email permission.");
      void refresh().catch(err => setError(errorMessage(err)));
    };
    window.addEventListener("message", listener);
    return () => { window.removeEventListener("message", listener); if (popupTimer.current) clearInterval(popupTimer.current); popup.current?.close(); };
  }, [apiOrigin, refresh]);

  const connect = async (provider: "google" | "microsoft") => {
    setError(""); setNotice("");
    const windowHandle = window.open("about:blank", "xonier-gmail-connect", "popup,width=540,height=720");
    if (!windowHandle) { setError("Allow popups for this CRM, then click Connect email again."); return; }
    if (popupTimer.current) clearInterval(popupTimer.current);
    popup.current = windowHandle; setConnecting(true);
    try {
      const result = await api.post<{ authorizationUrl: string }>(`/mail/connect/${provider}`);
      if (windowHandle.closed) { setConnecting(false); return; }
      windowHandle.location.href = result.data.authorizationUrl;
      let elapsedTicks = 0;
      popupTimer.current = setInterval(() => {
        if (windowHandle.closed || ++elapsedTicks >= 600) {
          if (popupTimer.current) clearInterval(popupTimer.current);
          setConnecting(false);
          void refresh().catch(err => setError(errorMessage(err)));
        }
      }, 1000);
    } catch (err) { windowHandle.close(); setConnecting(false); setError(errorMessage(err)); }
  };
  const disconnect = async () => {
    const { isConfirmed } = await ConfirmPopup({
      title: "Disconnect email?",
      text: "Disconnect your email from the CRM? Your CRM email history will remain.",
      btnTxt: "Disconnect",
      variant: "warning",
    });
    if (!isConfirmed) return;
    setDisconnecting(true); setError("");
    try {
      const result = await api.delete<{ revoked: boolean }>("/mail/connection");
      setNotice(result.data.revoked ? "Email disconnected." : "email disconnected from this CRM. You can also remove the app from your Google or Microsoft account’s app permissions.");
      await refresh();
    } catch (err) { setError(errorMessage(err)); } finally { setDisconnecting(false); }
  };
  const addFiles = (selectedFiles: FileList | null) => {
    const next = [...files, ...Array.from(selectedFiles || [])];
    if (next.length > 5 || next.reduce((sum, file) => sum + file.size, 0) > (connection?.provider === "microsoft" ? 2 : 10) * 1024 * 1024) setError(`Add up to 5 attachments, totaling ${connection?.provider === "microsoft" ? 2 : 10} MB or less.`);
    else { setFiles(next); setError(""); }
    if (fileInput.current) fileInput.current.value = "";
  };
  const send = async () => {
    if (sendLock.current || !connection?.connected) return;
    sendLock.current = true; setSending(true); setError(""); setNotice("");
    const payload = { to: splitEmails(to), cc: splitEmails(cc), bcc: splitEmails(bcc), subject, body, leadId: search.get("leadId") || null, replyToMessageId };
    const key = JSON.stringify({ ...payload, files: files.map(file => [file.name, file.size, file.lastModified]) });
    if (attempt.current?.key !== key) attempt.current = { key, requestId: crypto.randomUUID() };
    const data = new FormData();
    data.append("payload", JSON.stringify({ ...payload, requestId: attempt.current.requestId }));
    files.forEach(file => data.append("files", file));
    try {
      await api.post("/mail/send", data, { timeout: 65000 });
      setMailboxRevision(value => value + 1);
      attempt.current = null; setSubject(""); setBody(""); setFiles([]); setReplyToMessageId(null); setComposeOpen(false);
      setNotice("Email sent through your connected email. Customer replies will arrive in your mailbox.");
      await refresh();
    } catch (err) {
      // A definite rejection may be retried with a fresh request ID; uncertain sends retain their ID.
      if (axios.isAxiosError(err) && [400, 422].includes(err.response?.status || 0)) attempt.current = null;
      setError(errorMessage(err));
    }
    finally { setSending(false); sendLock.current = false; }
  };
  const openComposer = (mail?: GmailMessage) => {
    if (sendLock.current) return;
    const sender = mail?.replyTo || mail?.from || "";
    setTo((sender.match(/<([^<>]+)>/)?.[1] || sender).trim());
    setSubject(mail ? (/^Re:/i.test(mail.subject) ? mail.subject : `Re: ${mail.subject || "(No subject)"}`) : "");
    setCc(""); setBcc(""); setBody(""); setFiles([]);
    setShowCopies(false);
    setReplyToMessageId(mail?.id ?? null);
    setError("");
    setComposeOpen(true);
  };
  const inputClass = "min-w-0 w-full rounded-md bg-transparent px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-600/40 placeholder:text-slate-400";


  return <div className="-m-2 space-y-4 text-slate-800 dark:text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-700 dark:text-cyan-300">Communications</p><h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Mail className="text-cyan-600" />My Email</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Connect Gmail or Microsoft and manage customer conversations from one place.</p></div></header>
    {error && !composeOpen && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-slate-700 dark:bg-slate-800 sm:px-5"><div className="flex min-w-0 items-center gap-3"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/60 dark:text-cyan-300"><Mail size={19} /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="truncate text-sm font-semibold tracking-tight">{loading ? "Checking email…" : connection?.accountEmail || "Connect your email"}</h2>{connection?.connected && <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-500" />Connected</span>}</div><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{connection?.connected ? `Connected via ${connection.provider === "microsoft" ? "Microsoft" : "Google"} · sending from this address` : connection?.needsReconnect ? "Email permission expired. Reconnect to continue." : connection?.configured === false ? "Provider setup is required from your administrator." : "Choose an account and connect your email."}</p>{connection && (!connection.providers.google || !connection.providers.microsoft) && <p className="mt-1 text-[11px] text-slate-400">{!connection.providers.google && "Google setup required · "}{!connection.providers.microsoft && "Microsoft setup required"}</p>}</div></div><div className="flex flex-wrap items-center gap-2">{connection?.accountEmail && <button disabled={disconnecting || sending || connecting} onClick={() => void disconnect()} className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300">Disconnect</button>}{(["google", "microsoft"] as const).map(provider => <button key={provider} disabled={loading || !connection?.providers?.[provider] || connecting || sending || disconnecting} onClick={() => void connect(provider)} className={`rounded-lg px-3.5 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${connection?.provider === provider && connection.connected ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200" : "bg-cyan-700 text-white hover:bg-cyan-800"}`}>{provider === "google" ? (connection?.provider === "google" ? "Reconnect Gmail" : "Connect Gmail") : "Connect Microsoft"}</button>)}</div></section>
    <div className="@container min-w-0">
      <div className={composeOpen ? "grid min-w-0 items-start gap-4 @min-[900px]:grid-cols-[minmax(0,1fr)_minmax(360px,42%)]" : ""}>
        <div className="min-w-0 space-y-2">
        <nav aria-label="Email views" className="flex w-full items-center justify-between border-b border-slate-200 px-1 dark:border-slate-700">
          <div className="flex items-center gap-1">
            <button type="button" aria-pressed={mailView === "mailbox"} onClick={() => setMailView("mailbox")} className="rounded-t-lg border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition aria-pressed:border-cyan-700 aria-pressed:text-cyan-800 dark:text-slate-400 dark:aria-pressed:text-cyan-300"><span className="inline-flex items-center gap-2"><Inbox size={15} />Gmail mailbox</span></button>
            <button type="button" aria-pressed={mailView === "history"} onClick={() => setMailView("history")} className="rounded-t-lg border-b-2 border-transparent px-3 py-2 text-sm font-medium text-slate-500 transition aria-pressed:border-cyan-700 aria-pressed:text-cyan-800 dark:text-slate-400 dark:aria-pressed:text-cyan-300"><span className="inline-flex items-center gap-2"><Mail size={15} />CRM history</span></button>
          </div>
          <button type="button" onClick={() => openComposer()} className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-cyan-800"><PenLine size={15} />Compose</button>
        </nav>
        {connection?.connected && connection.provider === "google" && connection.inboxGranted ? (
          <div hidden={mailView !== "mailbox"}>
            <GmailMailbox key={connection.accountEmail} accountEmail={connection.accountEmail || "connected"} revision={mailboxRevision} onReply={openComposer} />
          </div>
        ) : mailView === "mailbox" && (
          <p className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800">
            {loading ? "Checking Gmail connection…" : "Connect Gmail and allow inbox access to see your email here."}
          </p>
        )}
        {mailView === "history" && (
      <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700 sm:px-5"><div><h2 className="text-sm font-semibold tracking-tight">CRM history</h2><p className="mt-0.5 text-xs text-slate-500">Latest 100 emails sent through Xonier CRM</p></div>{canViewCompanyHistory && <label className="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={company} onChange={event => { setCompany(event.target.checked); setSelected(null); }} className="accent-cyan-700" />Company history</label>}</div>
        {!history && !error && <p role="status" className="px-5 py-12 text-center text-sm text-slate-500">Loading CRM history…</p>}
        {history?.length === 0 && <p className="px-5 py-12 text-center text-sm text-slate-500">No emails sent yet.</p>}
        <div className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">{history?.map(mail => <button key={mail.id} onClick={() => setSelected(mail)} className="block w-full px-4 py-3.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/40 sm:px-5"><div className="flex items-start justify-between gap-3"><p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{mail.subject}</p><span className={`shrink-0 text-xs font-medium ${mail.status === "sent" ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{mail.gmailOutcome === "unknown" || mail.gmailOutcome === "sending" ? "Check Sent folder" : mail.status}</span></div><p className="mt-1 truncate text-xs text-slate-500">{mail.provider === "microsoft" ? "Microsoft" : "Google"} · To: {mail.to_emails.join(", ")}{company ? ` · From: ${mail.from_email}` : ""}</p><p className="mt-1 text-[11px] text-slate-400">{new Date(mail.created_at).toLocaleString()}</p></button>)}</div>
        <p className="border-t border-slate-100 px-4 py-2.5 text-[11px] text-slate-400 dark:border-slate-700 sm:px-5">Sent means your provider accepted the email; it does not confirm delivery or reading.</p>
      </section>
        )}
        </div>
        {composeOpen && (
          <section aria-labelledby="compose-title" className="row-start-1 min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white @min-[900px]:col-start-2 dark:border-slate-700 dark:bg-slate-800">
            <form id="mail-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
              <header className="flex items-center gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">
                  {replyToMessageId ? <Reply size={17} /> : <PenLine size={17} />}
                </span>
                <div className="min-w-0 flex-1">
                  <h2 ref={composerHeading} tabIndex={-1} id="compose-title" className="text-sm font-semibold">{replyToMessageId ? "Reply to email" : "New message"}</h2>
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400" title={connection?.accountEmail}>{connection?.accountEmail || "Connect an email account to send"}</p>
                </div>
                <button type="button" disabled={sending} onClick={() => setComposeOpen(false)} aria-label="Close composer" className="rounded-lg p-2 text-slate-500 hover:bg-slate-200 disabled:opacity-50 dark:hover:bg-slate-700"><X size={18} /></button>
              </header>
              <fieldset disabled={sending || connecting} className="min-w-0 px-4 disabled:opacity-70">
                <div className="flex items-center gap-2 border-b border-slate-100 py-1 dark:border-slate-700">
                  <label htmlFor="compose-to" className="w-14 shrink-0 text-sm text-slate-600 dark:text-slate-300">To</label>
                  <input id="compose-to" required readOnly={!!replyToMessageId} value={to} onChange={event => setTo(event.target.value)} placeholder="Recipients" className={inputClass} />
                  {!showCopies && <button type="button" onClick={() => setShowCopies(true)} className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700">Cc / Bcc</button>}
                </div>
                {showCopies && (
                  <>
                    <label className="flex items-center gap-2 border-b border-slate-100 py-1 dark:border-slate-700"><span className="w-14 shrink-0 text-sm text-slate-600 dark:text-slate-300">Cc</span><input value={cc} onChange={event => setCc(event.target.value)} className={inputClass} /></label>
                    <label className="flex items-center gap-2 border-b border-slate-100 py-1 dark:border-slate-700"><span className="w-14 shrink-0 text-sm text-slate-600 dark:text-slate-300">Bcc</span><input value={bcc} onChange={event => setBcc(event.target.value)} className={inputClass} /></label>
                  </>
                )}
                <label className="flex items-center gap-2 border-b border-slate-100 py-1 dark:border-slate-700"><span className="w-14 shrink-0 text-sm text-slate-600 dark:text-slate-300">Subject</span><input required readOnly={!!replyToMessageId} maxLength={250} value={subject} onChange={event => setSubject(event.target.value)} className={inputClass} /></label>
                <textarea aria-label="Message" placeholder="Write your message…" required rows={8} maxLength={100000} value={body} onChange={event => setBody(event.target.value)} className={`my-2 block resize-y leading-6 ${inputClass}`} />
                {files.length > 0 && <ul className="space-y-1 pb-3">{files.map((file, index) => (
                  <li key={`${file.name}-${index}`} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs dark:bg-slate-900">
                    <Paperclip size={14} className="shrink-0 text-slate-500" />
                    <span className="min-w-0 flex-1 truncate" title={file.name}>{file.name}</span>
                    <span className="shrink-0 text-slate-500">{Math.ceil(file.size / 1024)} KB</span>
                    <button type="button" aria-label={`Remove ${file.name}`} className="rounded-md p-1 hover:bg-slate-200 dark:hover:bg-slate-700" onClick={() => setFiles(current => current.filter((_, item) => item !== index))}><X size={14} /></button>
                  </li>
                ))}</ul>}
              </fieldset>
              {error && <p role="alert" className="mx-4 mb-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">{error}</p>}
              <footer className="border-t border-slate-200 px-4 py-3 dark:border-slate-700">
                <div className="flex flex-wrap items-center gap-2">
                  <button type="submit" disabled={!connection?.connected || sending || connecting || disconnecting} className="inline-flex items-center gap-2 rounded-full bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-800 disabled:opacity-50">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}{sending ? "Sending…" : "Send"}</button>
                  <input ref={fileInput} type="file" multiple hidden onChange={event => addFiles(event.target.files)} />
                  <button type="button" disabled={sending || connecting} onClick={() => fileInput.current?.click()} title={`Up to 5 files · ${connection?.provider === "microsoft" ? 2 : 10} MB total`} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:text-slate-300 dark:hover:bg-slate-700"><Paperclip size={16} />Attach files</button>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Company admins can view sent emails in CRM history.</p>
              </footer>
            </form>
          </section>
        )}
      </div>
    </div>
    {mailView === "history" && selected && (!company || canViewCompanyHistory) && <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{selected.subject}</h2><button onClick={() => setSelected(null)} aria-label="Close email preview"><X size={18} /></button></div><p className="mt-2 text-sm text-slate-500">From: {selected.from_email}<br />To: {selected.to_emails.join(", ")}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm">{selected.text_body}</p>{selected.attachments?.map((file, index) => <p key={index} className="mt-2 text-xs text-slate-500">Attachment: {file.name}</p>)}{selected.error_message && <p className="mt-3 text-sm text-amber-700">{selected.error_message}</p>}</section>}
  </div>;
}

type GmailSummary = { id: string; subject: string; from: string; to: string; date: string; unread: boolean };
type GmailMessage = Omit<GmailSummary, "unread"> & { body: string; bodyHtml?: string | null; attachments: string[]; replyTo?: string };
const mailAddress = (value: string) => value.match(/^(.*?)\s*<([^>]+)>$/)?.[1]?.replace(/^"|"$/g, "") || value.split("@")[0] || "Unknown sender";
const mailInitials = (value: string) => mailAddress(value).split(/\s+/).slice(0, 2).map(part => part[0]).join("").toUpperCase();
const mailAvatarTones = [
  "bg-sky-100 text-sky-800 ring-sky-200 dark:bg-sky-950 dark:text-sky-200 dark:ring-sky-900",
  "bg-violet-100 text-violet-800 ring-violet-200 dark:bg-violet-950 dark:text-violet-200 dark:ring-violet-900",
  "bg-emerald-100 text-emerald-800 ring-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:ring-emerald-900",
  "bg-amber-100 text-amber-900 ring-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:ring-amber-900",
  "bg-rose-100 text-rose-800 ring-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-900",
  "bg-indigo-100 text-indigo-800 ring-indigo-200 dark:bg-indigo-950 dark:text-indigo-200 dark:ring-indigo-900",
  "bg-teal-100 text-teal-800 ring-teal-200 dark:bg-teal-950 dark:text-teal-200 dark:ring-teal-900",
  "bg-orange-100 text-orange-900 ring-orange-200 dark:bg-orange-950 dark:text-orange-200 dark:ring-orange-900",
];
const mailAvatarTone = (value: string) => {
  const key = value.match(/<([^>]+)>/)?.[1] || mailAddress(value);
  const hash = [...key.trim().toLowerCase()].reduce((total, character) => (total * 31 + character.charCodeAt(0)) >>> 0, 0);
  return mailAvatarTones[hash % mailAvatarTones.length];
};
const mailDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const today = new Date();
  return date.toDateString() === today.toDateString()
    ? date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : date.toLocaleDateString([], { day: "numeric", month: "short", ...(date.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}) });
};

type GmailPage = { messages: GmailSummary[]; nextPageToken?: string };

function GmailMailbox({ accountEmail, revision, onReply }: { accountEmail: string; revision: number; onReply: (message: GmailMessage) => void }) {
  const [folder, setFolder] = useState<"INBOX" | "SENT">("INBOX");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState<string[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [pages, setPages] = useState<Record<string, { data: GmailPage; loadedAt: number; version: string }>>({});
  const pageToken = page[page.length - 1];
  const pageKey = JSON.stringify([folder, query, pageToken]);
  const version = `${revision}:${refresh}`;
  const cachedPage = pages[pageKey];
  const data = cachedPage?.data;
  const [messageId, setMessageId] = useState<string>();
  const [message, setMessage] = useState<GmailMessage>();
  const [listError, setListError] = useState("");
  const [messageError, setMessageError] = useState("");
  const seenStorageKey = `xonier:gmail:seen:${accountEmail.toLowerCase()}`;
  const [seenMessageIds, setSeenMessageIds] = useState<Set<string>>(() => new Set());
  const [seenStateLoaded, setSeenStateLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(seenStorageKey);
      const ids = saved ? JSON.parse(saved) : [];
      setSeenMessageIds(new Set(Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : []));
    } catch { setSeenMessageIds(new Set()); }
    finally { setSeenStateLoaded(true); }
  }, [seenStorageKey]);

  useEffect(() => {
    if (!seenStateLoaded) return;
    try { window.localStorage.setItem(seenStorageKey, JSON.stringify([...seenMessageIds].slice(-2000))); }
    catch { /* Keep the in-memory read state if browser storage is unavailable. */ }
  }, [seenMessageIds, seenStateLoaded, seenStorageKey]);

  useEffect(() => {
    setListError("");
    if (cachedPage?.version === version && Date.now() - cachedPage.loadedAt < 60_000) return;
    const controller = new AbortController();
    api.get<GmailPage>("/mail/inbox", {
      params: { folder, q: query || undefined, pageToken },
      signal: controller.signal,
    }).then(({ data }) => {
      if (controller.signal.aborted) return;
      setPages(current => Object.fromEntries([
        ...Object.entries(current).filter(([key]) => key !== pageKey).slice(-19),
        [pageKey, { data, loadedAt: Date.now(), version }],
      ]));
    }).catch(error => {
      if (!controller.signal.aborted) setListError(errorMessage(error));
    });
    return () => controller.abort();
  }, [folder, query, pageToken, pageKey, cachedPage, version]);

  const otherFolder = folder === "INBOX" ? "SENT" : "INBOX";
  const otherKey = JSON.stringify([otherFolder, "", undefined]);
  const otherPage = pages[otherKey];
  const currentPageReady = cachedPage?.version === version;
  useEffect(() => {
    if (!currentPageReady || query || pageToken || otherPage) return;
    const controller = new AbortController();
    api.get<GmailPage>("/mail/inbox", {
      params: { folder: otherFolder },
      signal: controller.signal,
    }).then(({ data }) => {
      if (!controller.signal.aborted) {
        setPages(current => ({ ...current, [otherKey]: { data, loadedAt: Date.now(), version } }));
      }
    }).catch(() => { /* The folder fetch can retry when selected. */ });
    return () => controller.abort();
  }, [currentPageReady, otherFolder, otherKey, otherPage, pageToken, query, version]);

  useEffect(() => {
    if (!messageId) return;
    const controller = new AbortController();
    api.get<GmailMessage>(`/mail/inbox/${encodeURIComponent(messageId)}`, { signal: controller.signal })
      .then(result => {
        if (controller.signal.aborted) return;
        setMessage(result.data);
        if (folder === "INBOX") setSeenMessageIds(current => new Set(current).add(messageId));
      })
      .catch(error => { if (!controller.signal.aborted) setMessageError(errorMessage(error)); });
    return () => controller.abort();
  }, [folder, messageId]);

  const open = (id?: string) => {
    setMessage(undefined); setMessageError(""); setMessageId(id);
  };
  const buttonClass = "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700";
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3 dark:border-slate-700 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 dark:bg-cyan-950/70 dark:text-cyan-300"><Inbox size={18} /></div>
          <div className="min-w-0"><h2 className="text-sm font-semibold tracking-tight">Your mailbox</h2><p className="truncate text-xs text-slate-500 dark:text-slate-400">Connected Gmail</p></div>
        </div>
        <div role="group" aria-label="Mailbox folder" className="flex items-center rounded-lg bg-slate-100/80 p-0.5 dark:bg-slate-900">
          {(["INBOX", "SENT"] as const).map(item => (
            <button key={item} type="button" aria-pressed={folder === item}
              onClick={() => { setFolder(item); setPage([]); open(); }}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${folder === item ? "bg-white text-cyan-800 ring-1 ring-slate-200/80 dark:bg-slate-700 dark:text-cyan-200 dark:ring-slate-600" : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"}`}>
              <span className="inline-flex items-center gap-1.5">{item === "INBOX" ? <Inbox size={13} /> : <Send size={12} />}{item === "INBOX" ? "Inbox" : "Sent"}</span>
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" aria-label="Refresh Gmail mailbox" className={buttonClass} onClick={() => setRefresh(value => value + 1)}><RefreshCw size={14} /><span className="hidden sm:inline">Refresh</span></button>
        </div>
      </div>
      {messageId ? (
        <div className="min-w-0">
          <div className="border-b border-slate-100 px-5 py-3 dark:border-slate-700"><button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-cyan-700 dark:text-slate-300" onClick={() => open()}><ArrowLeft size={16} />Back to {folder === "INBOX" ? "inbox" : "sent"}</button></div>
          {messageError ? <p role="alert" className="p-5 text-sm text-amber-700">{messageError}</p> : message ? (
            <article className="min-w-0 break-words p-5 sm:p-6">
              <h2 className="text-xl font-semibold leading-snug tracking-tight text-slate-900 dark:text-white">{message.subject || "(No subject)"}</h2>
              <div className="mt-5 flex items-start gap-3 border-b border-slate-100 pb-5 dark:border-slate-700">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-semibold text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200">{mailInitials(message.from)}</span>
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{mailAddress(message.from)}</p><p className="truncate text-xs text-slate-500" title={message.from}>{message.from}</p><p className="mt-1 truncate text-xs text-slate-500">To: {message.to}</p></div>
                <time className="shrink-0 text-xs text-slate-400" title={message.date}>{mailDate(message.date)}</time>
              </div>
              <EmailBody key={message.id} text={message.body} html={message.bodyHtml} />
              {!!message.attachments.length && <div className="flex flex-wrap gap-2 border-t border-slate-100 py-4 dark:border-slate-700">{message.attachments.map((attachment, index) => <span key={`${attachment}-${index}`} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-600 dark:border-slate-600 dark:text-slate-300"><Paperclip size={13} />{attachment}</span>)}</div>}
              {folder === "INBOX" && <button type="button" className="inline-flex items-center gap-2 rounded-lg bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800" onClick={() => onReply(message)}><Reply size={16} />Reply</button>}
            </article>
          ) : <p role="status" className="p-8 text-center text-sm text-slate-500">Loading message…</p>}
        </div>
      ) : (
        <>
          <form className="border-b border-slate-100 px-4 py-3 dark:border-slate-700 sm:px-5" onSubmit={event => { event.preventDefault(); setQuery(search.trim()); setPage([]); }}>
            <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 dark:bg-slate-900"><Search size={16} className="shrink-0 text-slate-400" /><input aria-label="Search Gmail" value={search} onChange={event => setSearch(event.target.value)} maxLength={500} placeholder="Search mail" className="min-w-0 flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-slate-400" /><button className="text-xs font-semibold text-cyan-700 hover:text-cyan-800 dark:text-cyan-300">Search</button></div>
          </form>
          {listError && <p role="alert" className="p-5 text-sm text-amber-700 dark:text-amber-300">{listError}</p>}
          {!data ? !listError && <p role="status" className="py-12 text-center text-sm text-slate-500">Loading Gmail…</p> :
            !data.messages.length ? <div className="py-16 text-center"><Inbox className="mx-auto mb-3 text-slate-300" size={32} /><p className="text-sm font-medium text-slate-600">No messages found</p><p className="mt-1 text-xs text-slate-400">Try another search or folder.</p></div> : (
              <ul className="max-h-[620px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-700">
                {data.messages.map(item => {
                  const unread = item.unread && !seenMessageIds.has(item.id);
                  return <li key={item.id}>
                    <button type="button" onClick={() => open(item.id)} className={`group flex w-full items-start gap-3 px-5 py-4 text-left transition-colors hover:bg-cyan-50/50 dark:hover:bg-slate-700/60 ${unread ? "bg-cyan-50/35 dark:bg-cyan-950/20" : ""}`}>
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-semibold ring-1 ring-inset ${mailAvatarTone(folder === "SENT" ? item.to : item.from)}`}>{mailInitials(folder === "SENT" ? item.to : item.from)}</span>
                      <span className="min-w-0 flex-1"><span className="flex items-baseline justify-between gap-2"><span className={`truncate text-sm ${unread ? "font-semibold text-slate-900 dark:text-white" : "font-medium text-slate-700 dark:text-slate-200"}`}>{mailAddress(folder === "SENT" ? item.to : item.from)}</span><time className={`shrink-0 text-[11px] ${unread ? "font-semibold text-cyan-700 dark:text-cyan-300" : "text-slate-400"}`} title={item.date}>{mailDate(item.date)}</time></span><span className={`mt-1 block truncate text-sm group-hover:text-cyan-900 dark:group-hover:text-cyan-100 ${unread ? "font-semibold text-slate-800 dark:text-slate-100" : "text-slate-600 dark:text-slate-300"}`}>{item.subject || "(No subject)"}</span><span className="mt-1 block truncate text-xs text-slate-400">{folder === "SENT" ? `To: ${item.to}` : item.from}</span></span>
                      {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-600" aria-label="Unread" />}
                    </button>
                  </li>;
                })}
              </ul>
            )}
          {(page.length > 0 || data?.nextPageToken) && <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 dark:border-slate-700"><span className="text-xs text-slate-400">Page {page.length + 1}</span><div className="flex gap-2"><button type="button" aria-label="Previous page" disabled={!page.length} className={buttonClass} onClick={() => setPage(page.slice(0, -1))}><ChevronLeft size={16} />Previous</button><button type="button" aria-label="Next page" disabled={!data?.nextPageToken} className={buttonClass} onClick={() => { if (data?.nextPageToken) setPage([...page, data.nextPageToken]); }}>Next<ChevronRight size={16} /></button></div></div>}
        </>
      )}
    </section>
  );
}
