"use client";
import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X, FileText } from "lucide-react";
import { chatApi, chatError, type SendMessage } from "@/src/services/chat.service";
import type { Attachment } from "@/src/types/chat";
import { useChat } from "./ChatProvider";
export default function ChatComposer({ cid, parentId = null, onSend }: { cid: string; parentId?: string | null; onSend: (command: SendMessage, files?: Attachment[]) => Promise<boolean> }) {
  const { uid, capabilities, typing } = useChat();
  const key = "trakeroo:chat:draft:" + uid + ":" + cid + ":" + (parentId || "main");
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const lastTyping = useRef(0);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  const draft = useRef("");
  useEffect(() => {
    mounted.current = true;
    queueMicrotask(() => { if (mounted.current) { try { draft.current = sessionStorage.getItem(key) || ""; setText(draft.current); } catch { /* private mode */ } } });
    return () => { mounted.current = false; try { if (draft.current) sessionStorage.setItem(key, draft.current); else sessionStorage.removeItem(key); } catch { /* best effort */ } };
  }, [key]);
  useEffect(() => { const timer = setTimeout(() => { try { if (text) sessionStorage.setItem(key, text); else sessionStorage.removeItem(key); } catch { /* Draft persistence is best effort. */ } }, 300); return () => clearTimeout(timer); }, [key, text]);
  useEffect(() => { if (field.current) { field.current.style.height = "auto"; field.current.style.height = Math.min(180, Math.max(48, field.current.scrollHeight)) + "px"; } }, [text]);
  const change = (value: string) => { draft.current = value; setText(value); if (Date.now() - lastTyping.current > 2500) { typing(cid); lastTyping.current = Date.now(); } };
  const upload = async (files: FileList | null) => {
    if (!files?.length || inFlight.current || uploading !== null) return;
    if (attachments.length + files.length > 5) { setError("Attach up to 5 files per message."); return; }
    setError("");
    for (const file of Array.from(files)) {
      if (file.size > (capabilities?.maxFileBytes || 0)) { setError("This file exceeds your workspace upload limit."); break; }
      setUploading(0);
      try { const attachment = await chatApi.upload(cid, file, progress => { if (mounted.current) setUploading(progress); }); if (mounted.current) setAttachments(previous => [...previous, attachment]); }
      catch (cause) { if (mounted.current) setError(chatError(cause)); }
      finally { if (mounted.current) setUploading(null); }
    }
    if (input.current) input.current.value = "";
  };
  const submit = async () => {
    if (inFlight.current || uploading !== null || (!text.trim() && !attachments.length)) return;
    const command = { clientId: crypto.randomUUID(), text: text.trim(), attachmentIds: attachments.map(file => file.id), parentId };
    const files = attachments;
    inFlight.current = true; setSending(true); setError("");
    // Optimistic timeline owns pending messages and their stable retry IDs.
    // Clear immediately; the teammate can keep writing while delivery is confirmed.
    draft.current = ""; setText(""); setAttachments([]); field.current?.focus();
    try { sessionStorage.removeItem(key); } catch { /* The outbox still owns retry state. */ }
    try { if (!await onSend(command, files) && mounted.current) setError("Delivery is unconfirmed. Use Retry on the message; your new draft is safe."); }
    catch { if (mounted.current) setError("Delivery is unconfirmed. Retry from the message timeline."); }
    finally { inFlight.current = false; if (mounted.current) setSending(false); }
  };
  return <div className="shrink-0 bg-white px-4 pb-4 pt-2 dark:bg-slate-900 md:px-6">
    {error && <p role="alert" className="mb-2 text-xs leading-relaxed text-red-600 dark:text-red-300">{error}</p>}
    <div className="rounded-xl border border-slate-300 bg-white shadow-sm transition focus-within:border-cyan-600 focus-within:ring-2 focus-within:ring-cyan-600/10 dark:border-slate-600 dark:bg-slate-900">
      {attachments.length > 0 && <div className="flex flex-wrap gap-2 px-3 pt-3">{attachments.map(file => <span key={file.id} className="flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-2.5 py-2 text-xs dark:bg-slate-800"><FileText size={15} /><span className="max-w-48 truncate">{file.name}</span><button aria-label={"Remove " + file.name} onClick={() => setAttachments(previous => previous.filter(item => item.id !== file.id))}><X size={14} /></button></span>)}</div>}
      <textarea ref={field} aria-label={parentId ? "Write a thread reply" : "Write a message"} value={text} maxLength={10000} rows={2} onChange={e => change(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }} placeholder={parentId ? "Reply in thread…" : "Message your teammates…"} className="block max-h-44 min-h-12 w-full resize-none bg-transparent px-4 py-3 text-sm leading-relaxed outline-none [overflow-wrap:anywhere]" />
      <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
        <div className="flex min-w-0 items-center gap-2"><input ref={input} type="file" multiple className="hidden" onChange={e => void upload(e.target.files)} accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.mp4,.mp3,.docx,.xlsx,.pptx" /><button type="button" aria-label="Attach files" title={capabilities?.files ? "Attach files" : capabilities?.filesReason || "File storage is not configured"} disabled={!capabilities?.files || uploading !== null || sending} onClick={() => input.current?.click()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><Paperclip size={19} /></button><span className="truncate text-[11px] text-slate-400">{uploading !== null ? "Uploading " + uploading + "%" : "Enter to send · Shift + Enter for a new line"}</span></div>
        <div className="flex shrink-0 items-center gap-2">{text.length > 8000 && <span className="text-[10px] tabular-nums text-slate-400">{text.length.toLocaleString()}/10,000</span>}<button type="button" aria-label="Send message" onClick={() => void submit()} disabled={sending || uploading !== null || (!text.trim() && !attachments.length)} className="flex h-9 w-10 items-center justify-center rounded-lg bg-cyan-700 text-white hover:bg-cyan-800 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-700">{sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={17} />}</button></div>
      </div>
    </div>
  </div>;
}
