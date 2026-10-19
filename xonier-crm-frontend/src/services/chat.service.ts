import axios from "axios";
import api from "@/src/lib/axios";
import type { Attachment, Capabilities, ChatCall, ChatMessage, ChatUser, Conversation, JoinCall } from "@/src/types/chat";

interface Envelope<T> { data: T }
const unwrap = <T>(response: { data: Envelope<T> }): T => response.data.data;
const path = (cid: string) => `/chat/conversations/${encodeURIComponent(cid)}`;
export interface SendMessage { clientId: string; text: string; attachmentIds: string[]; parentId: string | null }

export const chatApi = {
  capabilities: () => api.get<Envelope<Capabilities>>("/chat/capabilities").then(unwrap),
  users: (search = "") => api.get<Envelope<ChatUser[]>>("/chat/users", { params: { search } }).then(unwrap),
  conversations: () => api.get<Envelope<Conversation[]>>("/chat/conversations").then(unwrap),
  discover: () => api.get<Envelope<Pick<Conversation, "id" | "name" | "description">[]>>("/chat/channels/discover").then(unwrap),
  create: (payload: { kind: Conversation["kind"]; name: string; description: string; visibility: "private" | "public"; memberIds: string[] }) =>
    api.post<Envelope<Conversation>>("/chat/conversations", payload).then(unwrap),
  joinChannel: (cid: string) => api.post<Envelope<Conversation>>(`${path(cid)}/join`).then(unwrap),
  addMembers: (cid: string, userIds: string[]) => api.post<Envelope<Conversation>>(`${path(cid)}/members`, { userIds }).then(unwrap),
  removeMember: (cid: string, uid: string) => api.delete(`${path(cid)}/members/${uid}`),
  messages: (cid: string, params: { before?: number; after?: number; parentId?: string; search?: string } = {}) =>
    api.get<Envelope<{ items: ChatMessage[]; hasMore: boolean }>>(`${path(cid)}/messages`, { params }).then(unwrap),
  send: (cid: string, command: SendMessage) => api.post<Envelope<ChatMessage>>(`${path(cid)}/messages`, command).then(unwrap),
  edit: (cid: string, mid: string, text: string, version: number) => api.patch<Envelope<ChatMessage>>(`${path(cid)}/messages/${mid}`, { text, version }).then(unwrap),
  delete: (cid: string, mid: string) => api.delete<Envelope<ChatMessage>>(`${path(cid)}/messages/${mid}`).then(unwrap),
  reaction: (cid: string, mid: string, emoji: string) => api.post<Envelope<ChatMessage>>(`${path(cid)}/messages/${mid}/reactions`, { emoji }).then(unwrap),
  read: (cid: string, seq: number) => api.post(`${path(cid)}/read`, { seq }),
  presence: (cid: string) => api.get<Envelope<{ onlineIds: string[] }>>(`${path(cid)}/presence`).then(unwrap),
  ticket: () => api.post<Envelope<{ ticket: string }>>("/chat/ws-ticket").then(unwrap),
  calls: (cid: string) => api.get<Envelope<ChatCall[]>>(`${path(cid)}/calls`).then(unwrap),
  startCall: (cid: string, kind: "voice" | "video") => api.post<Envelope<ChatCall>>(`${path(cid)}/calls`, { kind }).then(unwrap),
  joinCall: (cid: string, callId: string) => api.post<Envelope<JoinCall>>(`${path(cid)}/calls/${callId}/join`).then(unwrap),
  endCall: (cid: string, callId: string) => api.post(`${path(cid)}/calls/${callId}/end`),
  declineCall: (cid: string, callId: string) => api.post(`${path(cid)}/calls/${callId}/decline`),
  file: (cid: string, fid: string) => api.get<Envelope<Attachment>>(`${path(cid)}/files/${fid}`).then(unwrap),
  download: (cid: string, fid: string) => api.get<Envelope<{ url: string }>>(`${path(cid)}/files/${fid}/download`).then(unwrap),
  upload: async (cid: string, file: File, onProgress: (progress: number) => void) => {
    const response = await api.post<Envelope<{ file: Attachment; upload: { url: string; fields: Record<string, string> } }>>(`${path(cid)}/files`, {
      name: file.name, size: file.size, contentType: file.type || "application/octet-stream",
    });
    const data = unwrap(response);
    const form = new FormData();
    Object.entries(data.upload.fields).forEach(([key, value]) => form.append(key, value));
    form.append("file", file);
    // No Trakeroo Authorization header/cookies are sent to the storage provider.
    await axios.post(data.upload.url, form, { onUploadProgress: event => onProgress(Math.round((event.loaded / (event.total || file.size)) * 100)) });
    return api.post<Envelope<Attachment>>(`${path(cid)}/files/${data.file.id}/complete`).then(unwrap);
  },
};

export function chatError(error: unknown) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    return typeof message === "string" ? message : error.response?.status === 422 ? "Please check the message, members or file type." : error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

export function websocketUrl(ticket: string) {
  const base = new URL(process.env.NEXT_PUBLIC_BASE_URL || "/api", window.location.origin);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = `${base.pathname.replace(/\/$/, "")}/chat/ws`;
  base.search = new URLSearchParams({ ticket }).toString();
  return base.toString();
}
