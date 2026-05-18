// src/types/dashboard/dashboard.types.ts

import { User } from "@/src/types";

// ── Params ────────────────────────────────────────────────────────────────────

export interface GetDashboardParams {
  page: number;
  limit: number;
  search: string;
}

export interface DashboardStatsParams {
  filter?: "today" | "this_week" | "this_month" | "this_year" | "custom";
  start_date?: string;
  end_date?: string;
}

// ── Period ────────────────────────────────────────────────────────────────────

export interface DashboardPeriod {
  filter: string;
  start: string;
  end: string;
  year: number;
  generatedAt: string;
}

// ── Companies ─────────────────────────────────────────────────────────────────

export interface CompanyStats {
  total: number;
  thisMonth: number;
  active: number;
  pending: number;
  suspended: number;
  inactive: number;
  deleted: number;
}

export interface LatestCompany {
  companyId: string;
  companyName: string;
  industry: string;
  country?: string;
  status: string;
  subscriptionCount: number;
  userLimit?: number;
  createdAt: string;
}

export interface TopCompany {
  companyName: string;
  companyId: string;
  industry: string;
  status: string;
  userCount: number;
  userLimit?: number;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface UserStats {
  total: number;
  thisMonth: number;
  active: number;
  inactive: number;
  suspended: number;
  deleted: number;
  notVerified: number;
  superAdmins?: number;
}

// ── Subscriptions ─────────────────────────────────────────────────────────────

export interface SubscriptionStats {
  total: number;
  active: number;
  trial: number;
  canceled: number;
  thisMonth: number;
  mrr: number;
  totalRevenue: number;
  periodRevenue: number;
  avgRevenue: number;
}

export interface RevenueStats {
  mrr: number;
  arr: number;
  monthlyTrend: {
    month: string;
    year: number;
    revenue: number;
    subscriptions: number;
  }[];
}

export interface PlanStat {
  planId: string;
  name: string;
  status: string;
  visibility: string;
  monthlyPrice: number;
  yearlyPrice: number;
  activeSubscriptions: number;
}

// ── Activity ──────────────────────────────────────────────────────────────────

export interface ActivityStats {
  total: number;
  thisMonth: number;
  byAction: { action: string; count: number }[];
  byEntity: { entityType: string; count: number }[];
}

export interface RecentActivity {
  entityType: string;
  action: string;
  title: string;
  description?: string;
  ipAddress?: string;
  createdAt: string;
}

// ── Trends ────────────────────────────────────────────────────────────────────

export interface MonthlyTrendItem {
  month: string;
  year: number;
  count: number;
}

export interface TrendsStats {
  monthlyCompanies: MonthlyTrendItem[];
  monthlyUsers: MonthlyTrendItem[];
}

// ── Breakdowns ────────────────────────────────────────────────────────────────

export interface BreakdownStats {
  companiesByStatus: { status: string; count: number }[];
  companiesByIndustry: { industry: string; count: number }[];
  companiesByCountry: { country: string; count: number }[];
  subscriptionsByPlan: { planId: string; planName: string; count: number; revenue: number }[];
  subscriptionsByBillingCycle: { cycle: string; count: number; revenue: number }[];
}

export interface ChurnStats {
  canceledThisPeriod: number;
  newThisPeriod: number;
  churnRate: number;
  revenueLost: number;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost" | "delete";
export type LeadSource = "website" | "referral" | "ads" | "newsletter" | "call" | "chatbot" | "email" | "linkedin" | string;

export interface LeadStats {
  total: number;
  thisMonth: number;
  active: number;
  won: number;
  lost: number;
  deleted: number;
  unassigned: number;
  inDeal: number;
}

export interface LatestLead {
  _id: string;
  lead_id: string;
  name?: string;
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

// ── Deals ─────────────────────────────────────────────────────────────────────

export type DealPipelineStage = "qualification" | "requirement_analysis" | "proposal" | "negotiation" | "won" | "lost";

export interface DealStats {
  total: number;
  thisMonth: number;
  active: number;
  closed: number;
  totalRevenue: number;
  periodRevenue: number;
  avgDealValue: number;
}

export interface DealPipelineBreakdownItem {
  pipeline: DealPipelineStage;
  count: number;
  totalAmount: number;
  percentage: number;
}

// ── Enquiries ─────────────────────────────────────────────────────────────────

export interface EnquiryStats {
  total: number;
  thisMonth: number;
  assigned: number;
  unassigned: number;
  active: number;
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

export interface TaskStats {
  total: number;
  thisMonth: number;
  completed: number;
  overdue: number;
  unassigned: number;
  completionRate: number;
}

export interface PriorityBreakdownItem {
  priority: string;
  count: number;
}

// ── Performers ────────────────────────────────────────────────────────────────

export interface TopPerformer {
  userId: string;
  firstName: string;
  lastName: string;
  wonLeads: number;
}

export interface ConversionRate {
  total: number;
  won: number;
  lost: number;
  conversionRate: number;
}

// ── Unified Dashboard Response ────────────────────────────────────────────────

export interface DashboardData {
  role: "super_admin" | "company_admin" | "manager" | "user";
  period: DashboardPeriod;

  // super_admin only
  companies?: CompanyStats;
  subscriptions?: SubscriptionStats;
  revenue?: RevenueStats;
  plans?: PlanStat[];
  activity?: ActivityStats;
  trends?: TrendsStats;
  breakdowns?: BreakdownStats;
  latestCompanies?: LatestCompany[];
  topCompaniesByUsers?: TopCompany[];
  recentActivities?: RecentActivity[];
  churn?: ChurnStats;

  // company_admin + super_admin
  users?: UserStats;

  // company_admin + manager
  leads?: LeadStats;
  deals?: DealStats;
  enquiries?: EnquiryStats;
  tasks?: TaskStats;
  monthlyLeadTrend?: MonthlyTrendItem[];
  monthlyDealTrend?: MonthlyTrendItem[];
  leadSourceBreakdown?: LeadSourceBreakdownItem[];
  leadStatusBreakdown?: LeadStatusBreakdownItem[];
  latestLeads?: LatestLead[];
  dealPipelineBreakdown?: DealPipelineBreakdownItem[];
  topPerformers?: TopPerformer[];
  conversionRate?: ConversionRate;
  taskPriorityBreakdown?: PriorityBreakdownItem[];
  enabledFeatures?: string[];

  // legacy fields
  user?: User;
  teams?: {
    totalTeams: number;
    activeTeams: number;
    totalMembers: number;
    deletedTeams: number;
  };
}

export interface DashboardApiResponse {
  success: boolean;
  status_code: number;
  message: string;
  data: DashboardData;
}