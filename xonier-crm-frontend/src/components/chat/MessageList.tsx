"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, MessageSquare, Pencil, Trash2, Loader2, Smile } from "lucide-react";
import { toast } from "react-toastify";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { ChatMessage } from "@/src/types/chat";
import { useChat } from "./ChatProvider";

const emojis = ["👍", "❤️", "😂", "🎉", "👀", "✅"];
function Avatar({ name }: { name: string }) {
  return <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-100 to-blue-100 text-xs font-bold text-cyan-800 dark:from-cyan-950 dark:to-blue-950 dark:text-cyan-200">{name.split(" ").slice(0, 2).map(n => n[0]).join("")}</span>;
}

function Message({ message, update, onThread, discard }: { message: ChatMessage; update: (m: ChatMessage) => void; onThread?: (m: ChatMessage) => void; discard: (id: string) => void }) {
  const { uid } = useChat();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);
  const [reactions, setReactions] = useState(false);
  const [busy, setBusy] = useState(false);
  const act = async (fn: () => Promise<ChatMessage>) => {
    setBusy(true);
    try { update(await fn()); setEditing(false); }
    catch (err) { toast.error(chatError(err)); }
    finally { setBusy(false); }
  };
  const download = async (fid: string) => {
    // Open synchronously to preserve browser popup permissions; URLs are short-lived.
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    try {
      const { url } = await chatApi.download(message.conversationId, fid);
      if (tab) tab.location.href = url; else window.location.assign(url);
    } catch (err) { tab?.close(); toast.error(chatError(err)); }
  };
  return <article className={`group relative flex gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${message.delivery ? "opacity-65" : ""}`}>
    <Avatar name={message.senderName} />
    <div className="min-w-0 flex-1">
      <div className="flex items-baseline gap-2"><span className="text-sm font-semibold text-slate-900 dark:text-slate-100">{message.senderName}</span><time className="text-[11px] text-slate-400" dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>{message.editedAt && !message.deletedAt && <span className="text-[10px] text-slate-400">edited</span>}</div>
      {message.deletedAt ? <p className="mt-1 text-sm italic text-slate-400">This message was deleted.</p> : editing ? <div className="mt-2"><textarea aria-label="Edit message" value={text} onChange={e => setText(e.target.value)} maxLength={10000} className="w-full rounded-lg border border-slate-300 bg-transparent p-2 text-sm dark:border-slate-600" /><div className="mt-2 flex gap-2"><button disabled={busy || !text.trim()} onClick={() => void act(() => chatApi.edit(message.conversationId, message.id, text.trim(), message.version))} className="rounded bg-cyan-700 px-3 py-1 text-xs text-white">Save</button><button onClick={() => setEditing(false)} className="text-xs">Cancel</button></div></div> : <>
        <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-700 dark:text-slate-200">{message.text}</p>
        {message.attachments.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{message.attachments.map(file => <button key={file.id} onClick={() => void download(file.id)} className="flex max-w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-left hover:border-cyan-500 dark:border-slate-600 dark:bg-slate-800"><FileText size={22} className="shrink-0 text-cyan-600" /><span className="min-w-0"><span className="block truncate text-xs font-medium">{file.name}</span><span className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(0)} KB · Download after scan</span></span><Download size={15} className="shrink-0 text-slate-400" /></button>)}</div>}
        <div className="mt-1 flex flex-wrap gap-1">{Object.entries(message.reactions).map(([emoji, users]) => <button key={emoji} disabled={busy} onClick={() => void act(() => chatApi.reaction(message.conversationId, message.id, emoji))} aria-label={`${emoji}, ${users.length} reactions`} className={`rounded-full border px-2 py-0.5 text-xs ${users.includes(uid) ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950" : "border-slate-200 dark:border-slate-600"}`}>{emoji} {users.length}</button>)}</div>
        {onThread && (message.replyCount > 0) && <button onClick={() => onThread(message)} className="mt-1 text-xs font-medium text-cyan-700 dark:text-cyan-300">{message.replyCount} {message.replyCount === 1 ? "reply" : "replies"} · Open thread</button>}
      </>}
      {message.delivery === "sending" && <span className="text-xs text-slate-400">Sending…</span>}
      {message.delivery === "failed" && <span className="text-xs text-red-500">Delivery unconfirmed · retry from the composer <button onClick={() => discard(message.clientId)} className="ml-2 underline">Dismiss</button></span>}
    </div>
    {!message.deletedAt && !message.delivery && !editing && <div className="absolute right-3 top-0 flex items-center gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm opacity-0 focus-within:opacity-100 group-hover:opacity-100 dark:border-slate-600 dark:bg-slate-800">
      <button title="React" aria-label="Add reaction" onClick={() => setReactions(!reactions)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Smile size={15} /></button>
      {onThread && <button title="Reply in thread" aria-label="Reply in thread" onClick={() => onThread(message)} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><MessageSquare size={15} /></button>}
      {message.senderId === uid && <><button title="Edit message" aria-label="Edit message" onClick={() => { setText(message.text); setEditing(true); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={15} /></button><button disabled={busy} title="Delete message" aria-label="Delete message" onClick={() => { if (window.confirm("Delete this message?")) void act(() => chatApi.delete(message.conversationId, message.id)); }} className="rounded p-1 text-red-500 hover:bg-red-50"><Trash2 size={15} /></button></>}
      {reactions && <div className="absolute right-0 top-full mt-1 flex gap-1 rounded-lg border border-slate-200 bg-white p-2 shadow-lg dark:bg-slate-800">{emojis.map(emoji => <button key={emoji} disabled={busy} aria-label={`React ${emoji}`} onClick={() => { setReactions(false); void act(() => chatApi.reaction(message.conversationId, message.id, emoji)); }} className="rounded p-1 hover:bg-slate-100 dark:hover:bg-slate-700">{emoji}</button>)}</div>}
    </div>}
  </article>;
}

export default function MessageList({ messages, loading, hasMore, loadOlder, update, discard, onThread, onRead }: {
  messages: ChatMessage[]; loading: boolean; hasMore: boolean; loadOlder: () => Promise<void>;
  update: (message: ChatMessage) => void; discard: (id: string) => void;
  onThread?: (message: ChatMessage) => void; onRead?: (seq: number) => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const bottom = useRef(true);
  const lastRead = useRef(0);
  const readRef = useRef(onRead);
  useEffect(() => { readRef.current = onRead; }, [onRead]);
  useEffect(() => {
    if (bottom.current && box.current) box.current.scrollTop = box.current.scrollHeight;
    const seq = Math.max(0, ...messages.filter(m => !m.delivery).map(m => m.seq));
    if (bottom.current && document.visibilityState === "visible" && seq > lastRead.current) { lastRead.current = seq; readRef.current?.(seq); }
  }, [messages]);
  const older = async () => {
    if (!box.current) return;
    const height = box.current.scrollHeight;
    bottom.current = false;
    await loadOlder();
    requestAnimationFrame(() => { if (box.current) box.current.scrollTop += box.current.scrollHeight - height; });
  };
  return <div ref={box} role="log" aria-label="Messages" className="min-h-0 flex-1 overflow-y-auto py-4" onScroll={() => {
    if (!box.current) return;
    bottom.current = box.current.scrollHeight - box.current.scrollTop - box.current.clientHeight < 80;
    if (bottom.current && document.visibilityState === "visible") {
      const seq = Math.max(0, ...messages.filter(m => !m.delivery).map(m => m.seq));
      if (seq > lastRead.current) { lastRead.current = seq; readRef.current?.(seq); }
    }
  }}>
    {hasMore && <div className="mb-3 text-center"><button disabled={loading} onClick={() => void older()} className="rounded-full border border-slate-200 px-4 py-1 text-xs text-slate-500 hover:border-cyan-500 dark:border-slate-600">{loading ? "Loading…" : "Load earlier messages"}</button></div>}
    {loading && !messages.length ? <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-cyan-600" /></div> : !messages.length ? <div className="flex h-full flex-col items-center justify-center gap-2 px-5 text-center"><MessageSquare className="text-cyan-600" size={32} /><p className="font-semibold">Start the conversation</p><p className="text-sm text-slate-400">A little hello goes a long way.</p></div> : messages.map((message, index) => <div key={`${message.senderId}:${message.clientId}`}>
      {(index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString()) && <div className="my-3 flex items-center gap-3 px-5"><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /><span className="text-[11px] font-medium text-slate-400">{new Date(message.createdAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span><span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" /></div>}
      <Message message={message} update={update} discard={discard} onThread={onThread} />
    </div>)}
  </div>;
}
