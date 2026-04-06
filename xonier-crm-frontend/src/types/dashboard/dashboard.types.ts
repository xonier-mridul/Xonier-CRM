import { User } from "@/src/types";
export interface GetDashboardParams {
  page: number,
  limit: number,
  search: string
}
// ─── Period ───────────────────────────────────────────────────────────────────

export interface DashboardPeriod {
  filter: "this_month" | "last_month" | "this_year" | "custom";
  start: string;
  end: string;
  year: number;
  generatedAt: string;
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export interface LeadStats {
  total: number;
  thisMonth: number;
  active: number;
  won: number;
  deleted: number;
  inDeal: number;
}

export type LeadStatus =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "won"
  | "lost" | "delete";

export type LeadSource =
  | "website"
  | "referral"
  | "ads"
  | "newsletter"
  | "call"
  | "chatbot"
  | "email"
  | "linkedin"
  | string;

export interface LatestLead {
  _id: string;
  lead_id: string;
  email: string;
  phone: string;
  source: LeadSource;
  status: LeadStatus;
  createdAt: string;
}

export interface LeadSourceBreakdownItem {
  count: number;
  source: LeadSource;
}

export interface LeadStatusBreakdownItem {
  count: number;
  status: LeadStatus;
}

// ─── Deals ────────────────────────────────────────────────────────────────────

export interface DealStats {
  total: number;
  thisMonth: number;
  active: number;
  closed: number;
  totalRevenue: number;
  monthlyRevenue: number;
}

export type DealPipelineStage =
  | "qualification"
  | "requirement_analysis"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export interface DealPipelineBreakdownItem {
  pipeline: DealPipelineStage;
  count: number;
  totalAmount: number;
  percentage: number;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface UserStats {
  total: number;
  thisMonth: number;
  active: number;
  inactive: number;
  suspended: number;
  deleted: number;
}

// ─── Enquiries ────────────────────────────────────────────────────────────────

export interface EnquiryStats {
  total: number;
  thisMonth: number;
  assigned: number;
  unassigned: number;
  active: number;
}

// ─── Trends ───────────────────────────────────────────────────────────────────

export interface MonthlyTrendItem {
  month: string;
  year: number;
  count: number;
}

// ─── Dashboard Response ───────────────────────────────────────────────────────

export interface DashboardData {
  role: "admin" | "manager" | "agent";
  period: DashboardPeriod;
  leads: LeadStats;
  deals: DealStats;
  users: UserStats;
  enquiries: EnquiryStats;
  monthlyLeadTrend: MonthlyTrendItem[];
  monthlyDealTrend: MonthlyTrendItem[];
  leadSourceBreakdown: LeadSourceBreakdownItem[];
  leadStatusBreakdown: LeadStatusBreakdownItem[];
  latestLeads: LatestLead[];
  dealPipelineBreakdown: DealPipelineBreakdownItem[];
  user?: User;
  teams?: {
    totalTeams: number,
    activeTeams: number,
    totalMembers: number,
    deletedTeams: number
  };
}

export interface DashboardApiResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: DashboardData;
}