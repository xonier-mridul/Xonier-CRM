export interface ChatUser { id: string; name: string }
export interface Conversation {
  id: string;
  kind: "dm" | "group" | "channel";
  name: string;
  description: string;
  visibility: "private" | "public";
  ownerId: string;
  settingsVersion?: number;
  archived?: boolean;
  memberIds: string[];
  memberNames: Record<string, string>;
  lastSeq: number;
  read: Record<string, number>;
  unread?: number;
  updatedAt: string;
  activeCallId?: string;
  lastMessage?: { text: string; senderName: string; seq: number; version?: number } | null;
}
export interface Attachment { id: string; name: string; size: number; contentType: string; state?: string }
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  clientId: string;
  text: string;
  parentId: string | null;
  attachments: Attachment[];
  seq: number;
  version: number;
  reactions: Record<string, string[]>;
  replyCount: number;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
  delivery?: "sending" | "failed";
  // HTTP reply acknowledgements carry the authoritative parent snapshot.
  threadParent?: ChatMessage;
}
export interface ChatCall {
  id: string;
  conversationId: string;
  kind: "voice" | "video";
  createdBy: string;
  creatorName: string;
  status: "ringing" | "live" | "ended" | "missed";
  participants: string[];
  declined: string[];
  createdAt: string;
  expiresAt: string;
  endedAt: string | null;
}
export interface Capabilities {
  ready: boolean; reason: string; files: boolean; calls: boolean;
  callsReason?: string; filesReason?: string;
  maxFileBytes: number; maxMembers: number; maxCallParticipants: number; currentUserId: string;
}
export interface ChatEvent {
  event: string;
  eventId?: string;
  conversationId?: string;
  data?: unknown;
}
export interface JoinCall { token: string; serverUrl: string; call: ChatCall }
export interface CallPreferences { username: string; audioEnabled: boolean; videoEnabled: boolean; audioDeviceId?: string; videoDeviceId?: string }
export function conversationName(c: Conversation, uid: string) {
  return c.kind === "dm" ? c.memberNames[c.memberIds.find(id => id !== uid) || ""] || "Direct message" : c.name;
}
