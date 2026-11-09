"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSelector } from "react-redux";
import axios from "axios";
import { Mail, Send, Paperclip, Loader2, Unplug, RefreshCw, X } from "lucide-react";
import api from "@/src/lib/axios";
import { RootState } from "@/src/store";
import { usePermissions } from "@/src/hooks/usePermissions";
import { PERMISSIONS } from "@/src/constants/enum";

type Connection = { provider?: "google" | "microsoft"; providers: { google: boolean; microsoft: boolean }; configured: boolean; connected: boolean; accountEmail?: string; needsReconnect: boolean; canViewCompany: boolean };
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
  const [history, setHistory] = useState<History[]>([]);
  const [company, setCompany] = useState(false);
  const [selected, setSelected] = useState<History | null>(null);
  const [to, setTo] = useState(() => search.get("to") || "");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
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
  const fileInput = useRef<HTMLInputElement>(null);
  const apiOrigin = new URL(process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api").origin;

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const [status, outbox] = await Promise.all([
      api.get<Connection>("/mail/connection", { signal }),
      api.get<History[]>("/mail/outbox", { params: { company }, signal }),
    ]);
    if (!signal?.aborted) { setConnection(status.data); setHistory(outbox.data); }
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
      if (event.data.result === "connected") { setNotice("Email connected. You can send emails from this account."); setError(""); }
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
    if (!window.confirm("Disconnect your email from the CRM? Your CRM email history will remain.")) return;
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
    const payload = { to: splitEmails(to), cc: splitEmails(cc), bcc: splitEmails(bcc), subject, body, leadId: search.get("leadId") || null };
    const key = JSON.stringify({ ...payload, files: files.map(file => [file.name, file.size, file.lastModified]) });
    if (attempt.current?.key !== key) attempt.current = { key, requestId: crypto.randomUUID() };
    const data = new FormData();
    data.append("payload", JSON.stringify({ ...payload, requestId: attempt.current.requestId }));
    files.forEach(file => data.append("files", file));
    try {
      await api.post("/mail/send", data, { timeout: 65000 });
      attempt.current = null; setSubject(""); setBody(""); setFiles([]);
      setNotice("Email sent through your connected email. Customer replies will arrive in your mailbox.");
      await refresh();
    } catch (err) {
      // A definite rejection may be retried with a fresh request ID; uncertain sends retain their ID.
      if (axios.isAxiosError(err) && [400, 422].includes(err.response?.status || 0)) attempt.current = null;
      setError(errorMessage(err));
    }
    finally { setSending(false); sendLock.current = false; }
  };
  const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-cyan-500 dark:border-slate-600 dark:bg-slate-800 disabled:opacity-60";

  return <div className="-m-2 space-y-4 text-slate-800 dark:text-slate-100">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="flex items-center gap-2 text-2xl font-bold"><Mail className="text-cyan-600" />My Email</h1><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Connect Gmail, Outlook, Hotmail or Microsoft 365 and send from your own address.</p></div><button aria-label="Refresh email connection and history" onClick={() => void refresh().catch(err => setError(errorMessage(err)))} className="rounded-lg border border-slate-200 p-2 dark:border-slate-600"><RefreshCw size={18} /></button></header>
    {error && <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">{error}</p>}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</p>}
    <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div><h2 className="font-semibold">{loading ? "Checking email…" : connection?.accountEmail || "Connect your email"}</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{connection?.connected ? `Connected via ${connection.provider === "microsoft" ? "Microsoft" : "Google"} · emails will be sent from this address.` : connection?.needsReconnect ? "Your email permission expired. Connect again to continue." : connection?.configured === false ? "Your administrator needs to complete the one-time provider app setup. Agents do not need Google Cloud Console or Azure portal." : "Choose an email account and allow the CRM to send emails. Your password stays with your email provider."}</p></div><div className="flex flex-wrap gap-2">{connection?.accountEmail && <button disabled={disconnecting || sending || connecting} onClick={() => void disconnect()} className="flex items-center gap-2 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 disabled:opacity-50"><Unplug size={16} />Disconnect</button>}{(["google", "microsoft"] as const).map(provider => <button key={provider} disabled={loading || !connection?.providers?.[provider] || connecting || sending || disconnecting} onClick={() => void connect(provider)} className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{provider === "google" ? "Connect Google" : "Connect Microsoft"}</button>)}</div></section>
    {connection && (!connection.providers.google || !connection.providers.microsoft) && <p className="text-xs text-slate-500">{!connection.providers.google && "Google connection needs one-time administrator setup. "}{!connection.providers.microsoft && "Microsoft connection needs one-time administrator setup."}</p>}
    <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
      <form onSubmit={event => { event.preventDefault(); void send(); }} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><h2 className="text-lg font-semibold">Compose email</h2><p className="text-xs text-slate-500">From: {connection?.accountEmail || "Connect email first"}</p>
        <fieldset disabled={sending || connecting} className="space-y-4 disabled:opacity-70">
          <label className="block text-sm font-medium">To<input required value={to} onChange={event => setTo(event.target.value)} placeholder="customer@example.com" className={`mt-1 ${inputClass}`} /></label>
          <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Cc<input value={cc} onChange={event => setCc(event.target.value)} className={`mt-1 ${inputClass}`} /></label><label className="text-sm font-medium">Bcc<input value={bcc} onChange={event => setBcc(event.target.value)} className={`mt-1 ${inputClass}`} /></label></div>
          <p className="text-xs text-slate-500">Separate addresses with commas. Up to 20 recipients total.</p>
          <label className="block text-sm font-medium">Subject<input required maxLength={250} value={subject} onChange={event => setSubject(event.target.value)} className={`mt-1 ${inputClass}`} /></label>
          <label className="block text-sm font-medium">Message<textarea required rows={10} maxLength={100000} value={body} onChange={event => setBody(event.target.value)} className={`mt-1 resize-y ${inputClass}`} /></label>
          <input ref={fileInput} type="file" multiple className="hidden" onChange={event => addFiles(event.target.files)} aria-label="Choose email attachments" />
          <button type="button" onClick={() => fileInput.current?.click()} className="flex items-center gap-2 text-sm text-cyan-600"><Paperclip size={16} />Add attachments <span className="text-xs text-slate-500">5 files · {connection?.provider === "microsoft" ? 2 : 10} MB total</span></button>
          {files.map((file, index) => <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900"><span className="truncate">{file.name} · {Math.ceil(file.size / 1024)} KB</span><button type="button" aria-label={`Remove ${file.name}`} onClick={() => setFiles(files.filter((_, item) => item !== index))}><X size={16} /></button></div>)}
        </fieldset>
        <button disabled={!connection?.connected || sending || connecting || disconnecting} className="flex items-center gap-2 rounded-lg bg-cyan-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">{sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}{sending ? "Sending…" : "Send email"}</button>
        <p className="text-xs leading-5 text-slate-500">Only emails sent through this CRM are recorded here. Your company admins can view this CRM history. Replies arrive in your mailbox; this connection does not read your inbox.</p>
      </form>
      <section className="min-w-0 space-y-4 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Email outbox</h2>{connection?.canViewCompany && hasPermission(PERMISSIONS.readEmailLog) && <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={company} onChange={event => { setCompany(event.target.checked); setSelected(null); }} />Company history</label>}</div>
        <p className="text-xs text-slate-500">Latest 100 CRM emails. Sent means your provider accepted the email; it does not confirm delivery or reading.</p>
        {!history.length && <p className="py-8 text-center text-sm text-slate-500">No emails sent yet.</p>}
        <div className="max-h-[620px] space-y-2 overflow-y-auto">{history.map(mail => <button key={mail.id} onClick={() => setSelected(mail)} className="block w-full rounded-lg border border-slate-100 p-3 text-left hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-700"><div className="flex items-start justify-between gap-3"><p className="truncate text-sm font-semibold">{mail.subject}</p><span className={`shrink-0 text-xs ${mail.status === "sent" ? "text-emerald-600" : "text-amber-600"}`}>{mail.gmailOutcome === "unknown" || mail.gmailOutcome === "sending" ? "Check Sent folder" : mail.status}</span></div><p className="mt-1 truncate text-xs text-slate-500">{mail.provider === "microsoft" ? "Microsoft" : "Google"} · To: {mail.to_emails.join(", ")}</p>{company && <p className="truncate text-xs text-slate-500">From: {mail.from_email}</p>}<p className="mt-1 text-xs text-slate-400">{new Date(mail.created_at).toLocaleString()}</p></button>)}</div>
      </section>
    </div>
    {selected && <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-800"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold">{selected.subject}</h2><button onClick={() => setSelected(null)} aria-label="Close email preview"><X size={18} /></button></div><p className="mt-2 text-sm text-slate-500">From: {selected.from_email}<br />To: {selected.to_emails.join(", ")}</p><p className="mt-4 whitespace-pre-wrap break-words text-sm">{selected.text_body}</p>{selected.attachments?.map((file, index) => <p key={index} className="mt-2 text-xs text-slate-500">Attachment: {file.name}</p>)}{selected.error_message && <p className="mt-3 text-sm text-amber-700">{selected.error_message}</p>}</section>}
  </div>;
}
