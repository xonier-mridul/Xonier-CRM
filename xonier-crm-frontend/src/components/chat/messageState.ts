import type { ChatMessage } from "@/src/types/chat";

/** HTTP acknowledgements and at-least-once socket events may arrive in either order. */
export function mergeMessages(current: ChatMessage[], incoming: ChatMessage[]) {
  const key = (message: ChatMessage) => message.senderId + ":" + message.clientId;
  const result = new Map(current.map(message => [key(message), message]));
  for (const message of incoming) {
    const existing = result.get(key(message));
    if (existing && !existing.delivery && message.delivery) continue;
    if (!existing || existing.delivery || message.version >= existing.version) result.set(key(message), message);
  }
  return [...result.values()].sort((a, b) => a.delivery ? b.delivery ? a.createdAt.localeCompare(b.createdAt) : 1 : b.delivery ? -1 : a.seq - b.seq);
}
