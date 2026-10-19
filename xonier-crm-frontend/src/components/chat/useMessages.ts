"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi, chatError, type SendMessage } from "@/src/services/chat.service";
import { useChat } from "./ChatProvider";
import type { ChatMessage } from "@/src/types/chat";

function merge(current: ChatMessage[], incoming: ChatMessage[]) {
  const key = (message: ChatMessage) => `${message.senderId}:${message.clientId}`;
  const result = new Map(current.map(message => [key(message), message]));
  for (const message of incoming) {
    const existing = result.get(key(message));
    if (!existing || existing.delivery || message.version >= existing.version) result.set(key(message), message);
  }
  return [...result.values()].sort((a, b) => a.delivery ? b.delivery ? a.createdAt.localeCompare(b.createdAt) : 1 : b.delivery ? -1 : a.seq - b.seq);
}

export function useMessages(cid: string, parentId: string | null = null, search = "") {
  const { uid, subscribe, refresh } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const messagesRef = useRef(messages);
  const confirmed = useRef(new Set<string>());
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    let cancelled = false;
    alive.current = true;
    const params = { ...(parentId ? { parentId } : {}), ...(search ? { search } : {}) };
    const sync = async (initial = false) => {
      try {
        const cursorBeforeSync = Math.max(0, ...messagesRef.current.filter(m => !m.delivery).map(m => m.seq));
        const latest = await chatApi.messages(cid, params);
        if (cancelled) return;
        latest.items.filter(m => m.senderId === uid).forEach(m => confirmed.current.add(m.clientId));
        // Catch up beyond one page. Mongo's transactional sequence prevents late
        // commits from being silently skipped while advancing this cursor.
        if (!initial && !search) {
          let cursor = cursorBeforeSync;
          for (let page = 0; page < 100 && !cancelled; page++) {
            const data = await chatApi.messages(cid, { ...params, after: cursor });
            if (cancelled || !data.items.length) break;
            setMessages(previous => merge(previous, data.items));
            cursor = data.items[data.items.length - 1].seq;
            if (!data.hasMore) break;
            if (page === 99) {
              // Very long offline gaps return to a contiguous recent window.
              setMessages(previous => merge(previous.filter(m => m.delivery), latest.items));
              setHasMore(latest.hasMore);
            }
          }
        }
        if (!cancelled) {
          setMessages(previous => initial ? merge(previous.filter(m => m.delivery || (!search && m.conversationId === cid && m.parentId === parentId)), latest.items) : merge(previous, latest.items));
          if (initial) setHasMore(latest.hasMore);
          setError("");
        }
      } catch (err) { if (!cancelled) setError(chatError(err)); }
      finally { if (!cancelled) setLoading(false); }
    };
    void sync(true);
    const unsubscribe = subscribe(event => {
      if (event.event === "sync.required") { void sync(); return; }
      if (event.conversationId !== cid) return;
      if (["message.created", "message.updated"].includes(event.event)) {
        const message = event.data as ChatMessage;
        if (message.senderId === uid) confirmed.current.add(message.clientId);
        if (message.parentId === parentId && !search) setMessages(previous => merge(previous, [message]));
        else if (!parentId && message.parentId) void sync();
      }
    });
    const timer = setInterval(() => { if (document.visibilityState === "visible") void sync(); }, 15000);
    return () => { cancelled = true; alive.current = false; clearInterval(timer); unsubscribe(); };
  }, [cid, parentId, search, subscribe, uid]);

  const loadOlder = async () => {
    const oldest = messages.find(m => !m.delivery)?.seq;
    if (!oldest) return;
    setLoading(true);
    try {
      const data = await chatApi.messages(cid, { before: oldest, ...(parentId ? { parentId } : {}), ...(search ? { search } : {}) });
      setMessages(previous => merge(previous, data.items)); setHasMore(data.hasMore);
    } catch (err) { setError(chatError(err)); }
    finally { setLoading(false); }
  };
  const send = useCallback(async (command: SendMessage, senderName: string) => {
    const optimistic: ChatMessage = { id: command.clientId, clientId: command.clientId, conversationId: cid,
      senderId: uid, senderName, text: command.text, parentId: command.parentId, attachments: [], seq: 0,
      version: 1, reactions: {}, replyCount: 0, createdAt: new Date().toISOString(), editedAt: null, deletedAt: null, delivery: "sending" };
    setMessages(previous => merge(previous, [optimistic]));
    try {
      const message = await chatApi.send(cid, command);
      confirmed.current.add(command.clientId);
      if (alive.current) setMessages(previous => merge(previous, [message]));
      void refresh().catch(() => {});
      return true;
    } catch (err) {
      // A WebSocket event can confirm the commit even if the HTTP response was lost.
      if (confirmed.current.has(command.clientId)) return true;
      if (alive.current) {
        setMessages(previous => previous.map(m => m.clientId === command.clientId ? { ...m, delivery: "failed" } : m));
        setError(chatError(err));
      }
      return false;
    }
  }, [cid, uid, refresh]);
  const update = (message: ChatMessage) => setMessages(previous => merge(previous, [message]));
  const discard = (clientId: string) => setMessages(previous => previous.filter(m => m.clientId !== clientId));
  return { messages, loading, hasMore, error, loadOlder, send, update, discard };
}
