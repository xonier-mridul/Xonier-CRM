"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { chatApi, chatError, type SendMessage } from "@/src/services/chat.service";
import { useChat } from "./ChatProvider";
import type { Attachment, ChatMessage } from "@/src/types/chat";

import { mergeMessages } from "./messageState";

type Pending = { command: SendMessage; optimistic: ChatMessage };
export function useMessages(cid: string, parentId: string | null = null, search = "") {
  const { uid, subscribe } = useChat();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const epoch = useRef(0);
  const rows = useRef<ChatMessage[]>([]);
  const pending = useRef(new Map<string, Pending>());
  const confirmed = useRef(new Set<string>());
  const storageKey = "trakeroo:communication:outbox:" + uid + ":" + cid + ":" + (parentId || "main");
  useEffect(() => { rows.current = messages; }, [messages]);
  const persist = useCallback(() => { try { if (pending.current.size) sessionStorage.setItem(storageKey, JSON.stringify([...pending.current.values()])); else sessionStorage.removeItem(storageKey); } catch { /* In-memory retry remains available if browser storage is full/blocked. */ } }, [storageKey]);
  useEffect(() => {
    let cancelled = false, syncing = false;
    alive.current = true; const generation = ++epoch.current;
    const params = { ...(parentId ? { parentId } : {}), ...(search ? { search } : {}) };
    const acknowledge = (items: ChatMessage[]) => {
      for (const message of items) if (message.senderId === uid && !message.delivery) { confirmed.current.add(message.clientId); pending.current.delete(message.clientId); }
      persist();
    };
    const sync = async (initial = false) => {
      if (syncing || cancelled) return;
      syncing = true;
      try {
        if (initial) { await Promise.resolve(); if (cancelled) return; setLoading(true); setMessages([]); rows.current = []; }
        const cursor = Math.max(0, ...rows.current.filter(message => !message.delivery).map(message => message.seq));
        const latest = await chatApi.messages(cid, params);
        if (cancelled) return;
        let incoming = latest.items;
        if (!initial && !search && incoming.length && cursor && incoming[0].seq > cursor) {
          let after = cursor;
          for (let page = 0; page < 20; page++) {
            const data = await chatApi.messages(cid, { ...params, after });
            if (cancelled) return;
            incoming = mergeMessages(incoming, data.items);
            if (!data.hasMore || !data.items.length) break;
            after = data.items[data.items.length - 1].seq;
            if (page === 19) { incoming = latest.items; setMessages(previous => previous.filter(message => message.delivery)); }
          }
        }
        acknowledge(incoming);
        if (!cancelled) { setMessages(previous => initial ? mergeMessages(search ? [] : [...pending.current.values()].map(item => item.optimistic), incoming) : mergeMessages(previous, incoming)); if (initial) setHasMore(latest.hasMore); setError(""); }
      } catch (cause) { if (!cancelled) setError(chatError(cause)); }
      finally { syncing = false; if (!cancelled) setLoading(false); }
    };
    try {
      const saved: Pending[] = JSON.parse(sessionStorage.getItem(storageKey) || "[]");
      // Migrate the old composer's uncertain send with its original id.
      const legacyKey = "trakeroo:chat:draft:" + uid + ":" + cid + ":" + (parentId || "main");
      const legacy = JSON.parse(sessionStorage.getItem(legacyKey + ":pending") || "null");
      if (legacy?.command?.clientId && legacy.command.parentId === parentId && !saved.some(item => item.command.clientId === legacy.command.clientId)) {
        saved.push({ command: legacy.command, optimistic: { id: legacy.command.clientId, clientId: legacy.command.clientId, conversationId: cid, senderId: uid, senderName: "You", text: legacy.command.text, parentId, attachments: legacy.attachments || [], seq: 0, version: 1, reactions: {}, replyCount: 0, createdAt: new Date().toISOString(), editedAt: null, deletedAt: null, delivery: "failed" } });
        sessionStorage.setItem(storageKey, JSON.stringify(saved));
        if ((sessionStorage.getItem(legacyKey) || "").trim() === legacy.command.text) sessionStorage.removeItem(legacyKey);
        sessionStorage.removeItem(legacyKey + ":pending");
      }
      for (const item of saved) if (item.command?.clientId && item.optimistic?.conversationId === cid && item.command.parentId === parentId) pending.current.set(item.command.clientId, { ...item, optimistic: { ...item.optimistic, delivery: "failed" } });
    } catch { /* Invalid/blocked browser storage is not an authority. */ }
    void sync(true);
    const unsubscribe = subscribe(event => {
      if (event.event === "sync.required") { void sync(); return; }
      if (event.conversationId !== cid || !["message.created", "message.updated"].includes(event.event)) return;
      const message = event.data as ChatMessage;
      acknowledge([message]);
      if (message.parentId === parentId && !search) setMessages(previous => mergeMessages(previous, [message]));
      else if (search) void sync();
    });
    const timer = setInterval(() => { if (document.visibilityState === "visible") void sync(); }, 30000);
    return () => { cancelled = true; alive.current = false; epoch.current = generation + 1; clearInterval(timer); unsubscribe(); };
  }, [cid, parentId, search, subscribe, uid, storageKey, persist]);
  const loadOlder = useCallback(async () => {
    if (loading) return;
    const oldest = rows.current.find(message => !message.delivery)?.seq;
    if (!oldest) return;
    const version = epoch.current; setLoading(true);
    try { const data = await chatApi.messages(cid, { before: oldest, ...(parentId ? { parentId } : {}), ...(search ? { search } : {}) }); if (epoch.current === version) { setMessages(previous => mergeMessages(previous, data.items)); setHasMore(data.hasMore); } }
    catch (cause) { if (epoch.current === version) setError(chatError(cause)); }
    finally { if (epoch.current === version) setLoading(false); }
  }, [cid, parentId, search, loading]);
  const send = useCallback(async (command: SendMessage, senderName: string, attachments: Attachment[] = []) => {
    if (confirmed.current.has(command.clientId)) return true;
    const previous = pending.current.get(command.clientId)?.optimistic;
    const optimistic: ChatMessage = previous ? { ...previous, delivery: "sending" } : { id: command.clientId, clientId: command.clientId, conversationId: cid, senderId: uid, senderName, text: command.text, parentId: command.parentId, attachments, seq: 0, version: 1, reactions: {}, replyCount: 0, createdAt: new Date().toISOString(), editedAt: null, deletedAt: null };
    optimistic.delivery = "sending"; pending.current.set(command.clientId, { command, optimistic }); persist();
    setMessages(previous => mergeMessages(previous, [{ ...optimistic }]));
    try {
      const message = await chatApi.send(cid, command);
      confirmed.current.add(command.clientId); pending.current.delete(command.clientId); persist();
      if (alive.current) setMessages(previous => mergeMessages(previous, [message]));
      return true;
    } catch (cause) {
      if (confirmed.current.has(command.clientId)) return true;
      pending.current.set(command.clientId, { command, optimistic: { ...optimistic, delivery: "failed" } }); persist();
      if (alive.current) { setMessages(previous => previous.map(message => message.clientId === command.clientId ? { ...message, delivery: "failed" } : message)); setError(chatError(cause)); }
      return false;
    }
  }, [cid, uid, persist]);
  const retry = useCallback(async (clientId: string) => { const item = pending.current.get(clientId); if (item && item.optimistic.delivery !== "sending") await send(item.command, item.optimistic.senderName, item.optimistic.attachments); }, [send]);
  const update = useCallback((message: ChatMessage) => setMessages(previous => mergeMessages(previous, [message])), []);
  const discard = useCallback((clientId: string) => { pending.current.delete(clientId); persist(); setMessages(previous => previous.filter(message => message.clientId !== clientId)); }, [persist]);
  return { messages, loading, hasMore, error, loadOlder, send, update, discard, retry };
}
