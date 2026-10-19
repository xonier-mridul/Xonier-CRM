"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, Send, X, FileText } from "lucide-react";
import { chatApi, chatError, type SendMessage } from "@/src/services/chat.service";
import type { Attachment } from "@/src/types/chat";
import { useChat } from "./ChatProvider";

export default function ChatComposer({ cid, parentId = null, onSend }: {
  cid: string; parentId?: string | null; onSend: (command: SendMessage) => Promise<boolean>;
}) {
  const { uid, capabilities, typing } = useChat();
  const key = `trakeroo:chat:draft:${uid}:${cid}:${parentId || "main"}`;
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const lastTyping = useRef(0);
  const mounted = useRef(true);
  const failed = useRef<SendMessage | null>(null);
  useEffect(() => {
    mounted.current = true;
    const restore = async () => {
      await Promise.resolve();
      try {
        if (!mounted.current) return;
        setText(sessionStorage.getItem(key) || "");
        const saved = JSON.parse(sessionStorage.getItem(`${key}:pending`) || "null") as { command: SendMessage; attachments: Attachment[] } | null;
        if (saved?.command?.clientId && saved.command.parentId === parentId && Array.isArray(saved.attachments)) {
          failed.current = saved.command;
          setText(saved.command.text);
          setAttachments(saved.attachments);
          setError("An earlier message was not confirmed. Send to safely retry it.");
        }
      } catch { /* private browsing or an invalid saved draft */ }
    };
    void restore();
    return () => { mounted.current = false; };
  }, [key, parentId]);
  const clearPending = () => {
    failed.current = null;
    try { sessionStorage.removeItem(`${key}:pending`); } catch { /* private browsing */ }
  };
  const change = (value: string) => {
    setText(value); clearPending(); setError("");
    try { sessionStorage.setItem(key, value); } catch { /* private browsing */ }
    if (Date.now() - lastTyping.current > 2000) { typing(cid); lastTyping.current = Date.now(); }
  };
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    if (attachments.length + files.length > 5) { setError("You can attach up to 5 files per message."); return; }
    setError("");
    for (const file of Array.from(files)) {
      if (file.size > (capabilities?.maxFileBytes || 0)) { setError("This file exceeds your workspace upload limit."); break; }
      setUploading(0);
      try {
        const attachment = await chatApi.upload(cid, file, progress => { if (mounted.current) setUploading(progress); });
        if (mounted.current) { clearPending(); setAttachments(previous => [...previous, attachment]); }
      } catch (err) { if (mounted.current) setError(chatError(err)); }
      finally { if (mounted.current) setUploading(null); }
    }
    if (input.current) input.current.value = "";
  };
  const submit = async () => {
    if (sending || uploading !== null || (!text.trim() && !attachments.length)) return;
    const command = failed.current || { clientId: crypto.randomUUID(), text: text.trim(), attachmentIds: attachments.map(a => a.id), parentId };
    failed.current = command;
    try { sessionStorage.setItem(`${key}:pending`, JSON.stringify({ command, attachments })); } catch { /* private browsing */ }
    setSending(true); setError("");
    const success = await onSend(command);
    if (!mounted.current) return;
    setSending(false);
    if (success) {
      setText(""); setAttachments([]); clearPending();
      try { sessionStorage.removeItem(key); } catch { /* private browsing */ }
    } else {
      // An uncertain HTTP response may already have committed: retry the SAME key.
      failed.current = command;
      setError("Could not confirm delivery. Send again to retry safely.");
    }
  };
  return <div className="border-t border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
    {error && <p role="alert" className="mb-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    {attachments.length > 0 && <div className="mb-3 flex flex-wrap gap-2">{attachments.map(file => <span key={file.id} className="flex max-w-full items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-xs dark:bg-slate-800"><FileText size={14} /><span className="truncate">{file.name}</span><button disabled={sending} aria-label={`Remove ${file.name}`} onClick={() => { clearPending(); setAttachments(previous => previous.filter(a => a.id !== file.id)); }}><X size={14} /></button></span>)}</div>}
    <div className="rounded-xl border border-slate-300 shadow-sm focus-within:border-cyan-600 dark:border-slate-600">
      <textarea aria-label={parentId ? "Write a thread reply" : "Write a message"} value={text} disabled={sending} maxLength={10000} rows={3}
        onChange={e => change(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); void submit(); } }}
        placeholder={parentId ? "Reply in thread…" : "Write a message…"} className="block w-full resize-none bg-transparent px-4 pt-3 text-sm outline-none disabled:opacity-60" />
      <div className="flex items-center justify-between px-3 pb-3">
        <div className="flex items-center gap-3"><input ref={input} type="file" multiple className="hidden" onChange={e => void upload(e.target.files)} accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.txt,.csv,.mp4,.mp3,.docx,.xlsx,.pptx" />
          <button type="button" aria-label="Attach files" title={capabilities?.files ? "Attach files" : "File sharing requires storage and scanner setup"} disabled={!capabilities?.files || uploading !== null || sending} onClick={() => input.current?.click()} className="rounded-md p-1 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"><Paperclip size={19} /></button>
          {uploading !== null ? <span className="text-xs text-cyan-700">Uploading {uploading}%</span> : <span className="text-xs text-slate-400">Shift + Enter for a new line</span>}
        </div>
        <button type="button" aria-label="Send message" onClick={() => void submit()} disabled={sending || uploading !== null || (!text.trim() && !attachments.length)} className="rounded-lg bg-cyan-700 p-2.5 text-white transition hover:bg-cyan-800 disabled:opacity-40">{sending ? <Loader2 size={17} className="animate-spin" /> : <Send size={17} />}</button>
      </div>
    </div>
  </div>;
}
