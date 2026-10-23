"use client";
import { memo, useEffect, useRef, useState } from "react";
import { ArrowDown, Check, Download, FileText, MessageSquare, Pencil, Trash2, Loader2, Smile, RotateCcw } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmPopup from "@/src/components/ui/ConfirmPopup";
import { chatApi, chatError } from "@/src/services/chat.service";
import type { ChatMessage } from "@/src/types/chat";
import { useChat } from "./ChatProvider";
import { PersonAvatar } from "./ChatDialog";
import ReactionPicker from "./ReactionPicker";
type PickerTarget = { messageId: string; anchor: HTMLElement; select: (emoji: string) => void };
function TextBody({ value }: { value: string }) {
  const [expanded, setExpanded] = useState(false);
  const long = value.length > 700 || value.split("\n").length > 12;
  return <div><p className={"mt-1 whitespace-pre-wrap text-[13px] leading-[1.75] text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200 " + (long && !expanded ? "line-clamp-6" : "")}>{long && !expanded ? value.slice(0, 700) : value}</p>{long && <button onClick={() => setExpanded(!expanded)} className="mt-1.5 text-xs font-semibold text-cyan-700 hover:underline dark:text-cyan-300">{expanded ? "Show less" : "Read full message (" + value.length.toLocaleString() + " characters)"}</button>}</div>;
}
const Message = memo(function Message({ message, update, onThread, discard, retry, readonly, presence, pickerOpen, openPicker }: { message: ChatMessage; update: (value: ChatMessage) => void; onThread?: (value: ChatMessage) => void; discard: (id: string) => void; retry: (id: string) => Promise<void>; readonly?: boolean; presence?: string[]; pickerOpen: boolean; openPicker: (value: PickerTarget | null) => void }) {
  const { uid, onlineIds } = useChat();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(message.text);
  const [busy, setBusy] = useState(false);
  const act = async (action: () => Promise<ChatMessage>) => {
    setBusy(true);
    try { update(await action()); setEditing(false); }
    catch (cause) { toast.error(chatError(cause)); }
    finally { setBusy(false); }
  };
  const remove = async () => {
    const result = await ConfirmPopup({ title: "Delete this message?", text: "The message will be removed from this conversation for everyone. A deleted-message marker will remain.", btnTxt: "Delete message" });
    if (result.isConfirmed) await act(() => chatApi.delete(message.conversationId, message.id));
  };
  const download = async (id: string) => {
    const tab = window.open("about:blank", "_blank"); if (tab) tab.opener = null;
    try { const { url } = await chatApi.download(message.conversationId, id); if (tab) tab.location.href = url; else window.location.assign(url); }
    catch (cause) { tab?.close(); toast.info(chatError(cause)); }
  };
  return <article data-message-id={message.id} className={"group/message relative flex gap-3 px-4 py-2.5 transition hover:bg-slate-50/80 dark:hover:bg-slate-800/50 md:px-6 " + (message.delivery === "sending" ? "opacity-65" : "")}>
    <PersonAvatar name={message.senderName} online={(presence || onlineIds).includes(message.senderId)} />
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 pr-8"><span className="text-[13px] font-semibold text-slate-900 dark:text-white">{message.senderName}{message.senderId === uid && <span className="ml-1 text-[10px] font-normal text-slate-400">you</span>}</span><time className="text-[10px] tabular-nums text-slate-400" dateTime={message.createdAt} title={new Date(message.createdAt).toLocaleString()}>{new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>{message.editedAt && !message.deletedAt && <span className="text-[10px] text-slate-400">edited</span>}</div>
      {message.deletedAt ? <p className="mt-1 text-xs italic text-slate-400">Message deleted</p> : editing && !readonly ? <div className="mt-2"><textarea autoFocus aria-label="Edit message" value={text} onChange={e => setText(e.target.value)} maxLength={10000} rows={Math.min(8, Math.max(3, text.split("\n").length))} className="w-full resize-y rounded-xl border border-cyan-600 bg-transparent p-3 text-sm outline-none" /><div className="mt-2 flex items-center gap-3"><button disabled={busy || !text.trim()} onClick={() => void act(() => chatApi.edit(message.conversationId, message.id, text.trim(), message.version))} className="rounded-lg bg-cyan-700 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40">{busy ? "Saving…" : "Save changes"}</button><button disabled={busy} onClick={() => setEditing(false)} className="text-xs text-slate-500">Cancel</button></div></div> : <>
        {!!message.text && <TextBody value={message.text} />}
        {!!message.attachments.length && <div className="mt-2 flex flex-wrap gap-2">{message.attachments.map(file => <button disabled={!!message.delivery} key={file.id} onClick={() => void download(file.id)} title="Files are available after the security scan completes" className="flex max-w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left transition hover:border-cyan-600 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800"><FileText size={23} className="shrink-0 text-cyan-600" /><span className="min-w-0"><span className="block max-w-56 truncate text-xs font-medium">{file.name}</span><span className="text-[10px] text-slate-400">{file.size < 1048576 ? Math.ceil(file.size / 1024) + " KB" : (file.size / 1048576).toFixed(1) + " MB"} · Security-checked download</span></span><Download size={14} className="shrink-0 text-slate-400" /></button>)}</div>}
        {!!Object.keys(message.reactions).length && <div className="mt-2 flex flex-wrap gap-1">{Object.entries(message.reactions).map(([emoji, users]) => <button key={emoji} disabled={readonly || busy || !!message.delivery} onClick={() => void act(() => chatApi.reaction(message.conversationId, message.id, emoji))} aria-label={emoji + ", " + users.length + " reactions"} aria-pressed={users.includes(uid)} title={users.includes(uid) ? "Remove your reaction" : "Add your reaction"} className={"rounded-full border px-2 py-0.5 text-xs " + (users.includes(uid) ? "border-cyan-400 bg-cyan-50 dark:bg-cyan-950" : "border-slate-200 hover:bg-slate-100 dark:border-slate-600 dark:hover:bg-slate-800")}>{emoji} <span className="ml-0.5 tabular-nums">{users.length}</span></button>)}</div>}
        {!!onThread && message.replyCount > 0 && <button onClick={() => onThread(message)} className="mt-2 flex items-center gap-1.5 text-xs font-medium text-cyan-700 hover:underline dark:text-cyan-300"><MessageSquare size={12} />{message.replyCount} {message.replyCount === 1 ? "reply" : "replies"}<span className="font-normal text-slate-400">View thread</span></button>}
      </>}
      {message.delivery === "sending" && <span role="status" className="mt-1 flex items-center gap-1 text-[10px] text-slate-400"><Loader2 size={10} className="animate-spin" />Sending securely…</span>}
      {message.delivery === "failed" && <div role="status" className="mt-2 flex flex-wrap items-center gap-3 text-xs text-amber-700 dark:text-amber-400"><span>Delivery not confirmed</span><button disabled={readonly} onClick={() => void retry(message.clientId)} className="flex items-center gap-1 font-semibold underline disabled:opacity-40"><RotateCcw size={12} />Retry safely</button><button onClick={() => discard(message.clientId)} title="Dismiss the local copy; a message already accepted by the server may reappear" className="text-slate-400">Dismiss</button></div>}
      {!message.delivery && !message.deletedAt && message.senderId === uid && <span className="sr-only"><Check size={10} />Saved to conversation</span>}
    </div>
    {!readonly && !message.deletedAt && !message.delivery && !editing && <div className={"absolute right-3 top-0 z-10 flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-1 text-slate-500 shadow-sm focus-within:opacity-100 group-hover/message:opacity-100 dark:border-slate-600 dark:bg-slate-800 " + (pickerOpen ? "opacity-100" : "opacity-100 sm:opacity-0")}>
      <button disabled={busy} title="React" aria-label="Add reaction" aria-expanded={pickerOpen} onClick={event => openPicker(pickerOpen ? null : { messageId: message.id, anchor: event.currentTarget, select: emoji => { void act(() => chatApi.reaction(message.conversationId, message.id, emoji)); } })} className="rounded p-1.5 hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-700"><Smile size={15} /></button>
      {onThread && <button title="Reply in thread" aria-label="Reply in thread" onClick={() => onThread(message)} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"><MessageSquare size={15} /></button>}
      {message.senderId === uid && <><button title="Edit message" aria-label="Edit message" onClick={() => { setText(message.text); setEditing(true); }} className="rounded p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700"><Pencil size={15} /></button><button disabled={busy} title="Delete message" aria-label="Delete message" onClick={() => void remove()} className="rounded p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"><Trash2 size={15} /></button></>}
    </div>}
  </article>;
});
function MessageList({ messages, loading, hasMore, loadOlder, update, discard, retry, onThread, onRead, readonly, presence }: {
  messages: ChatMessage[]; loading: boolean; hasMore: boolean; loadOlder: () => Promise<void>; update: (message: ChatMessage) => void;
  discard: (id: string) => void; retry: (id: string) => Promise<void>; onThread?: (message: ChatMessage) => void; onRead?: (seq: number) => void; readonly?: boolean; presence?: string[];
}) {
  const { uid } = useChat();
  const box = useRef<HTMLDivElement>(null);
  const bottom = useRef(true), lastRead = useRef(0), lastSeq = useRef(0), lastOwn = useRef("");
  const [unseen, setUnseen] = useState(0);
  const [picker, setPicker] = useState<PickerTarget | null>(null);
  const pickerMessage = picker && messages.find(message => message.id === picker.messageId && !message.deletedAt && !message.delivery);
  const readRef = useRef(onRead);
  useEffect(() => { readRef.current = onRead; }, [onRead]);
  useEffect(() => {
    const own = messages.findLast(message => message.delivery && message.senderId === uid);
    if (own && own.clientId !== lastOwn.current) { lastOwn.current = own.clientId; bottom.current = true; }
    if (bottom.current && box.current) box.current.scrollTop = box.current.scrollHeight;
    const seq = Math.max(0, ...messages.filter(message => !message.delivery).map(message => message.seq));
    if (!bottom.current && seq > lastSeq.current) { const added = messages.filter(message => !message.delivery && message.seq > lastSeq.current).length; queueMicrotask(() => setUnseen(value => value + added)); }
    lastSeq.current = seq;
    if (bottom.current && document.visibilityState === "visible" && seq > lastRead.current) { lastRead.current = seq; readRef.current?.(seq); }
  }, [messages, uid]);
  const older = async () => { if (!box.current) return; const height = box.current.scrollHeight; bottom.current = false; await loadOlder(); requestAnimationFrame(() => { if (box.current) box.current.scrollTop += box.current.scrollHeight - height; }); };
  return <div className="relative flex min-h-0 flex-1 flex-col"><div ref={box} role="log" aria-label="Messages" aria-live="off" className="min-h-0 flex-1 overflow-y-auto py-4 [scrollbar-gutter:stable]" onScroll={() => {
    if (!box.current) return;
    bottom.current = box.current.scrollHeight - box.current.scrollTop - box.current.clientHeight < 80;
    if (bottom.current) { setUnseen(0); const seq = Math.max(0, ...messages.filter(message => !message.delivery).map(message => message.seq)); if (document.visibilityState === "visible" && seq > lastRead.current) { lastRead.current = seq; readRef.current?.(seq); } }
  }}>
    {hasMore && <div className="mb-4 text-center"><button disabled={loading} onClick={() => void older()} className="rounded-full border border-slate-200 px-4 py-1.5 text-xs text-slate-500 hover:border-cyan-600 dark:border-slate-600">{loading ? "Loading…" : "Load earlier messages"}</button></div>}
    {loading && !messages.length ? <div className="flex h-full min-h-48 items-center justify-center gap-2 text-sm text-slate-400"><Loader2 size={18} className="animate-spin text-cyan-600" />Loading messages…</div> : !messages.length ? <div className="flex h-full min-h-48 flex-col items-center justify-center gap-2 px-5 text-center"><span className="mb-2 rounded-2xl bg-slate-100 p-4 text-cyan-700 dark:bg-slate-800"><MessageSquare size={25} /></span><h3 className="text-sm font-semibold">A new space for conversation</h3><p className="max-w-xs text-xs leading-relaxed text-slate-400">Share a first message, an idea, or a quick hello.</p></div> : messages.map((message, index) => <div key={message.senderId + ":" + message.clientId} style={{ contentVisibility: "auto", containIntrinsicSize: "auto 90px" }}>
      {(index === 0 || new Date(messages[index - 1].createdAt).toDateString() !== new Date(message.createdAt).toDateString()) && <div className="my-4 flex items-center gap-3 px-6"><span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" /><span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900">{new Date(message.createdAt).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span><span className="h-px flex-1 bg-slate-100 dark:bg-slate-800" /></div>}
      <Message message={message} update={update} discard={discard} retry={retry} onThread={onThread} readonly={readonly} presence={presence} pickerOpen={picker?.messageId === message.id} openPicker={setPicker} />
    </div>)}
  </div>{picker && pickerMessage && !readonly && <ReactionPicker key={picker.messageId} message={pickerMessage} uid={uid} anchor={picker.anchor} close={() => setPicker(null)} select={picker.select} />}{unseen > 0 && <button onClick={() => { if (box.current) box.current.scrollTo({ top: box.current.scrollHeight, behavior: "smooth" }); setUnseen(0); }} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-cyan-700 px-4 py-2 text-xs font-medium text-white shadow-lg"><ArrowDown size={13} />{unseen} new {unseen === 1 ? "message" : "messages"}</button>}</div>;
}
export default memo(MessageList);
