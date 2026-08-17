export type AppMode = "partner" | "admin";

export type PartnerPanel =
  | "p-dashboard"
  | "p-clients"
  | "p-commissions"
  | "p-forecast"
  | "p-payouts"
  | "p-settings";

export type AdminPanel =
  | "a-dashboard"
  | "a-partners"
  | "a-tiers"
  | "a-queue"
  | "a-batches";

export type Panel = PartnerPanel | AdminPanel;

export type BadgeTone =
  | "active"
  | "trial"
  | "paid"
  | "accrued"
  | "pending"
  | "churned";

export interface ReferredClient {
  id: string;
  name: string;
  initials: string;
  activeUsers: number | null;
  mrr: number | null;
  tierPct: number | null;
  status: BadgeTone;
  statusLabel: string;
  progressNoteKey: string;
  progressNoteVars?: Record<string, string | number>;
}

export interface CommissionRow {
  period: string;
  client: string;
  revenue: number;
  tierPct: number;
  commission: number;
  status: BadgeTone;
}

export interface PayoutRow {
  period: string;
  amount: number;
  reference: string;
  status: BadgeTone;
}

export interface PartnerRow {
  initials: string;
  name: string;
  clients: number;
  referredMrr: string;
  agreement: string;
  status: BadgeTone;
}

export interface TierRow {
  minUsers: string;
  maxUsers: string;
  commissionPct: string;
  effectiveFrom: string;
}

export interface ApprovalRow {
  partner: string;
  client: string;
  revenue: string;
  commission: string;
  tierPct: string;
}

export interface BatchRow {
  batch: string;
  period: string;
  total: string;
  status: BadgeTone;
}
