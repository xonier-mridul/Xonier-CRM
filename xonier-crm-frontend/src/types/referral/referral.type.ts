// ============================================================
// HRJee Referral Partner Portal — Type Definitions
// Aligned with PDD v1.0 — Section 8 (Key Data Entities)
// ============================================================

export type BadgeTone =
  | "active"
  | "trial"
  | "paid"
  | "accrued"
  | "pending"
  | "churned"
  | "approved"
  | "won"
  | "lost"
  | "disputed"
  | "suspended"
  | "terminated"
  | "failed"
  | "requested"
  |"processing";

export type AppMode = "partner" | "admin";

export type Panel =
  // ---- Partner-facing panels (Section 5.1–5.7, 5.9) ----
  | "p-dashboard"
  | "p-leads"          // was p-clients — renamed to match doc terminology
  | "p-commissions"
  | "p-forecast"
  | "p-payouts"
  | "p-documents"      // NEW — 5.9 Communication & Enablement
  | "p-settings"
  | "p-clients"


  // ---- Admin/internal panels (Section 5.3, 5.8, 5.10) ----
  | "a-dashboard"
  | "a-partners"       // 5.1 Onboarding & Profile (internal side)
  | "a-tiers"          // 5.6 Commission Rule Engine
  | "a-queue"          // 5.3 Lead Assignment & Routing
  | "a-batches"        // 6.3 Payout batch processing
  | "a-reports"        // NEW — 5.8 Reporting & Analytics
  | "a-compliance";    // NEW — 5.10 Contract & Compliance

// ============================================================
// Enums / Union Types (derived from workflow tables 6.1–6.4)
// ============================================================

export type PartnerStatus = "pending" | "active" | "suspended"|"churned" | "terminated"|"trial";

export type PartnerType = "individual" | "agency" | "Technology Partner";

// Table 12.1 Glossary — Tier
export type PartnerTier = "referral" | "reseller" | "strategic";

export type PartnerUserRole = "Partner Admin" | "Partner User";

// Table 5.4 pipeline stages
export type LeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "demo"
  | "proposal"
  | "won"
  | "lost";

// Table 2.1 — Commission Structure by Deal Type
export type DealType =
  | "new_subscription"
  | "renewal"
  | "additional_license"
  | "upsell"
  | "ai_addon";

// Table 6.3 — Commission ledger states
export type LedgerStatus =
  | "Pending Approval"
  | "Approved"
  | "Paid"
  | "Disputed";

export type PayoutStatus = "requested" | "processing" | "paid" | "failed"|"pending";

export type NotificationChannel = "email" | "sms" | "whatsapp" | "in-app";

export type NotificationMode = "real-time" | "daily-digest" | "weekly-digest";

export type ActivityVisibility = "partner" | "internal";




export interface PartnerRow {
  initials: string;
  name: string;
  clients: number;
  referredMrr: string;
  agreement: string; // YYYY-MM
  status: PartnerStatus;
  tier: PartnerTier;
}

export interface ApprovalRow {
  partner: string;
  client: string;
  dealType: DealType;
  revenue: string;
  commission: string;
  commissionPct: string;
}

export type BatchStatus = "pending" | "paid";

export interface BatchRow {
  batch: string;
  period: string; // YYYY-MM
  total: string;
  status: BatchStatus;
}


export type ClientStatus = "active" | "trial" | "churned";

export interface ReferredClient {
  id: string;
  name: string;
  initials: string;
  activeUsers: number | null;
  mrr: number;
  status: ClientStatus;
  statusLabel: string;
  lastDealType: DealType;
  progressNoteKey: string;
  progressNoteVars?: {
    count: number;
  };
}

export type CommissionStatus = "pending" | "approved" | "paid";

export interface CommissionRow {
  period: string; // YYYY-MM
  client: string;
  dealType: DealType;
  revenue: number;
  commissionPct: number;
  commission: number;
  status: CommissionStatus;
}


export interface PayoutRow {
  period: string; // YYYY-MM
  amount: number;
  reference: string;
  status: PayoutStatus;
}

// ============================================================
// Core Data Entities — Table 8.1
// ============================================================

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  ifsc: string;
  bankName: string;
}

export interface Partner {
  id: string;
  name: string;
  type: PartnerType;
  tier: PartnerTier;
  status: PartnerStatus;
  agreementId?: string;
  bankDetails?: BankDetails;
  kycDocs?: {
    agreementUrl?: string;
    panGstUrl?: string;
  };
  createdAt: string;
}

export interface PartnerUser {
  id: string;
  partnerId: string;
  name: string;
  email: string;
  role: PartnerUserRole;
  notificationPrefs: {
    channels: NotificationChannel[];
    mode: NotificationMode;
  };
}

export interface Lead {
  id: string;
  partnerId: string;
  submittedBy: string;          // Partner User id
  company: string;
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  companySize?: string;
  requirement?: string;
  dealValue: number;
  dealType: DealType;
  stage: LeadStage;
  assignedTo?: string;          // Sales Rep id
  slaDueAt?: string;            // 6.2 step 2 — SLA timer
  slaBreached?: boolean;
  source?: string;
  isDuplicate?: boolean;
  lossReason?: string;          // shown to partner per 5.4
  createdAt: string;
  updatedAt: string;
  createdDaysAgo?:number
  submittedAt?:string
}



export interface LeadActivity {
  id: string;
  leadId: string;
  actor: string;
  action: string;
  note?: string;
  visibility: ActivityVisibility; // partner-visible vs internal-only
  timestamp: string;
}

// 5.6 Configurable commission rule engine
export interface CommissionRule {
  id: string;
  tier?: PartnerTier;
  dealType: DealType;
  percentage: number;
  effectiveFrom: string;
  isOverride?: boolean;
  label: string;
  description: string;
}

export interface CommissionLedgerEntry {
  id: string;
  leadId?: string;
  partnerId?: string;
  dealType: DealType;
  dealValue: number;
  percentage: number;
  amount: number;
  status: LedgerStatus;
  createdAt?: string;
  approvedAt?: string;
  paidAt?: string;
  disputeNote?: string;
}

export interface Payout {
  id: string;
  partnerId: string;
  entryIds: string[];           // linked ledger entries
  totalAmount: number;
  status: PayoutStatus;
  requestedAt: string;
  processedAt?: string;
  reference?: string;
  statementUrl?: string;
}

export interface Agreement {
  id: string;
  partnerId: string;
  documentUrl?: string;
  startDate: string;
  endDate: string;
  noticePeriodDays: number;
  terminationTriggered?: boolean;
}

// 6.4 Revenue Forecasting Workflow
export interface ForecastEntry {
  period: string;               // e.g. "2026-09"
  projectedNewDealCommission: number;
  confirmedRenewalCommission: number;
  total: number;
}

export interface ForecastFilter {
  timePeriod: "3m" | "6m" | "12m";
  dealType?: DealType | "all";
}

// 5.9 Communication & Enablement
export interface EnablementDoc {
  id: string;
  title: string;
  category: "Pitch Deck" | "Pricing Sheet" | "Case Study" | "Collateral";
  fileUrl: string;
  updatedAt: string;
  fileType?:string
  fileSize?:string

}

export interface LeadComment {
  id: string;
  leadId: string;
  authorId: string;
  authorRole: "partner" | "sales_rep";
  message: string;
  timestamp: string;
}

// 5.8 Reporting & Analytics (Admin)
export interface PartnerScorecard {
  partnerId: string;
  partnerName: string;
  leadsSubmitted: number;
  conversionRate: number;
  revenueGenerated: number;
  tier: PartnerTier;
  suggestedTierAction?: "upgrade" | "downgrade" | "none";
}