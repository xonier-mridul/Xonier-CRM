export type CallSessionStatus =
  | "pending"
  | "delivered"
  | "dialing"
  | "ended"
  | "failed"
  | "cancelled"
  | "expired";

export interface CallSession {
  id: string;
  leadId: string;
  leadName?: string | null;
  status: CallSessionStatus;
  failureReason?: string | null;
  requestedAt: string;
  deliveredAt?: string | null;
  dialedAt?: string | null;
  endedAt?: string | null;
  durationSec?: number | null;
  disposition?: "connected" | "not_connected" | null;
  disposedAt?: string | null;
  mobileOnline?: boolean;
}

export interface CallRequestResult {
  session: CallSession;
  mobileOnline: boolean;
  pushed: boolean;
}

export interface CallDisposeResult {
  session: CallSession;
  connectStatus: "connected" | "not_connected";
  leadStatusUpdated: boolean;
  warning?: string | null;
}
