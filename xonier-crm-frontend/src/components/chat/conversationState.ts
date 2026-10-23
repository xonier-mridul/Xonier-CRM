import type { ChatMessage, Conversation } from "@/src/types/chat";

/** Settings, sequence and read cursors advance independently, even across races. */
export function mergeConversation(previous: Conversation | undefined, incoming: Conversation, uid: string): Conversation {
  if (!previous) return incoming;
  const settings = (incoming.settingsVersion || 1) >= (previous.settingsVersion || 1) ? incoming : previous;
  const latest = incoming.lastSeq >= previous.lastSeq ? incoming : previous;
  const preview = previous.lastMessage && incoming.lastMessage && previous.lastMessage.seq === incoming.lastMessage.seq
    && (previous.lastMessage.version || 0) > (incoming.lastMessage.version || 0) ? previous.lastMessage : latest.lastMessage;
  const read = { ...previous.read };
  for (const [id, seq] of Object.entries(incoming.read)) read[id] = Math.max(read[id] || 0, seq);
  return { ...settings, lastSeq: Math.max(previous.lastSeq, incoming.lastSeq), lastMessage: preview,
    updatedAt: incoming.updatedAt > previous.updatedAt ? incoming.updatedAt : previous.updatedAt, read,
    unread: (read[uid] || 0) >= (latest.lastMessage?.seq || 0) ? 0 : latest.unread ?? previous.unread ?? 0 };
}

export function applyConversationMessage(items: Conversation[], message: ChatMessage, created: boolean, uid: string) {
  return items.map(item => {
    if (item.id !== message.conversationId) return item;
    if (message.parentId) return { ...item, lastSeq: Math.max(item.lastSeq, message.seq),
      updatedAt: message.createdAt > item.updatedAt ? message.createdAt : item.updatedAt };
    const isNew = created && message.seq > (item.lastMessage?.seq || 0);
    if (!isNew && item.lastMessage?.seq !== message.seq) return item;
    if (!isNew && (item.lastMessage?.version || 0) > message.version) return item;
    return { ...item, lastSeq: Math.max(item.lastSeq, message.seq),
      updatedAt: isNew && message.createdAt > item.updatedAt ? message.createdAt : item.updatedAt,
      lastMessage: { text: message.deletedAt ? "Message deleted" : message.text.slice(0, 140) || "Shared a file",
        senderName: message.senderName, seq: message.seq, version: message.version },
      unread: (item.unread || 0) + (isNew && message.senderId !== uid && message.seq > (item.read[uid] || 0) ? 1 : 0) };
  }).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
