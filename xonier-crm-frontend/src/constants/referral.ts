import {
 
  ApprovalRow,
  BatchRow,
  CommissionRow,
  CommissionRule,
  DealType,
  Lead,
  LeadStage,
  PartnerRow,
  PayoutRow,
  ReferredClient,
} from "../types/referral/referral.type";


/* ---------------------------------------------------------------------- */
/* PRD Table 2.1 — Commission Structure by Deal Type                      */
/* ---------------------------------------------------------------------- */

export const dealTypeLabels: Record<DealType, string> = {
  new_subscription: "New subscription (Year 1)",
  renewal: "Renewal",
  additional_license: "Additional licenses",
  upsell: "New modules / upsell",
  ai_addon: "AI add-ons",
};

export const commissionRules: CommissionRule[] = [
  {
    id: "rule-new",
    dealType: "new_subscription",
    label: dealTypeLabels.new_subscription,
    percentage: 20,
    effectiveFrom: "2026-01-01",
    description: "20% of first-year subscription value",
  },
  {
    id: "rule-renewal",
    dealType: "renewal",
    label: dealTypeLabels.renewal,
    percentage: 10,
    effectiveFrom: "2026-01-01",
    description: "10% of renewal value",
  },
  {
    id: "rule-addl",
    dealType: "additional_license",
    label: dealTypeLabels.additional_license,
    percentage: 10,
    effectiveFrom: "2026-01-01",
    description: "10% of incremental value (existing account)",
  },
  {
    id: "rule-upsell",
    dealType: "upsell",
    label: dealTypeLabels.upsell,
    percentage: 20,
    effectiveFrom: "2026-01-01",
    description: "20% of upsell value",
  },
  {
    id: "rule-ai",
    dealType: "ai_addon",
    label: dealTypeLabels.ai_addon,
    percentage: 20,
    effectiveFrom: "2026-01-01",
    description: "20% of AI add-on value",
  },
];

// Kept for any dashboard chip/legend that still wants a flat pct list
export const commissionTiers = commissionRules.map((r) => ({
  pct: r.percentage,
  rangeLabel: r.label,
  dealType: r.dealType,
}));

/* ---------------------------------------------------------------------- */
/* Partner dashboard metrics (PRD 5.7 — Revenue Progress & Forecasting)   */
/* ---------------------------------------------------------------------- */

export const partnerDashboardMetrics = {
  activeClients: 14,
  activeClientsDelta: "+2",
  referredMrr: "$38.4k",
  referredMrrDelta: "+6.1%",
  commissionMonth: "$9,940",
  commissionMonthDelta: "+4.4%",
  lifetimeEarned: "$142.6k",
};

/* ---------------------------------------------------------------------- */
/* Referred clients (PRD Lead -> Won -> referred client)                  */
/* ---------------------------------------------------------------------- */

export const dashboardClients: ReferredClient[] = [
  {
    id: "client-a",
    name: "Client A",
    initials: "CA",
    activeUsers: 210,
    mrr: 4200,
    status: "active",
    statusLabel: "active",
    lastDealType: "new_subscription",
    progressNoteKey: "",
  },
  {
    id: "client-b",
    name: "Client B",
    initials: "CB",
    activeUsers: 640,
    mrr: 11800,
    status: "active",
    statusLabel: "active",
    lastDealType: "upsell",
    progressNoteKey: "",
  },
  {
    id: "client-c",
    name: "Client C",
    initials: "CC",
    activeUsers: 60,
    mrr: 900,
    status: "trial",
    statusLabel: "trial",
    lastDealType: "new_subscription",
    progressNoteKey: "",
  },
];

export const myClients: ReferredClient[] = [
  {
    id: "client-a",
    name: "Client A",
    initials: "CA",
    activeUsers: 210,
    mrr: 4200,
    status: "active",
    statusLabel: "active",
    lastDealType: "new_subscription",
    progressNoteKey: "partner.clients.note.clientA",
    progressNoteVars: { count: 210 },
  },
  {
    id: "client-b",
    name: "Client B",
    initials: "CB",
    activeUsers: 640,
    mrr: 11800,
    status: "active",
    statusLabel: "active",
    lastDealType: "upsell",
    progressNoteKey: "partner.clients.note.clientB",
    progressNoteVars: { count: 640 },
  },
  {
    id: "client-c",
    name: "Client C",
    initials: "CC",
    activeUsers: 60,
    mrr: 900,
    status: "trial",
    statusLabel: "trial",
    lastDealType: "new_subscription",
    progressNoteKey: "partner.clients.note.clientC",
    progressNoteVars: { count: 60 },
  },
  {
    id: "client-d",
    name: "Client D",
    initials: "CD",
    activeUsers: null,
    mrr: 0,
    status: "churned",
    statusLabel: "churned",
    lastDealType: "renewal",
    progressNoteKey: "partner.clients.note.clientD",
  },
];

/* ---------------------------------------------------------------------- */
/* Commission ledger (PRD 5.6 / 6.3)                                      */
/* ---------------------------------------------------------------------- */

export const commissionRows: CommissionRow[] = [
  { period: "2026-08", client: "Client B", dealType: "upsell", revenue: 11800, commissionPct: 20, commission: 2360, status: "pending" },
  { period: "2026-08", client: "Client A", dealType: "new_subscription", revenue: 4200, commissionPct: 20, commission: 840, status: "pending" },
  { period: "2026-08", client: "Client C", dealType: "new_subscription", revenue: 900, commissionPct: 20, commission: 180, status: "approved" },
  { period: "2026-07", client: "Client B", dealType: "renewal", revenue: 10900, commissionPct: 10, commission: 1090, status: "paid" },
  { period: "2026-07", client: "Client A", dealType: "additional_license", revenue: 3950, commissionPct: 10, commission: 395, status: "paid" },
];

export const forecastMetrics = {
  oneYear: "$42.6k",
  fiveYear: "$268k",
  tenYear: "$611k",
  twentyYear: "$1.4M",
};

export const payoutRows: PayoutRow[] = [
  { period: "2026-08", amount: 4770, reference: "", status: "pending" },
  { period: "2026-07", amount: 4320, reference: "UTR-88213", status: "paid" },
  { period: "2026-06", amount: 3910, reference: "UTR-87004", status: "paid" },
  { period: "2026-05", amount: 3640, reference: "UTR-85761", status: "paid" },
];

/* ---------------------------------------------------------------------- */
/* Admin overview (PRD 5.8 — Reporting & Analytics)                       */
/* ---------------------------------------------------------------------- */

export const adminOverviewMetrics = {
  activePartners: 37,
  referredClients: 212,
  mrrUnderReferral: "$412k",
  accruedLiability: "$98.4k",
};

export const pendingApproval = {
  count: 18,
  total: "$12,940",
};

export const partnerRows: PartnerRow[] = [
  { initials: "JG", name: "Jeevant Global Solutions", clients: 4, referredMrr: "$17.9k", agreement: "2031-06", status: "active", tier: "strategic" },
  { initials: "RP", name: "Rashi Partners", clients: 6, referredMrr: "$22.4k", agreement: "2028-03", status: "active", tier: "reseller" },
  { initials: "NC", name: "NorthCore Consulting", clients: 2, referredMrr: "$5.1k", agreement: "2027-11", status: "trial", tier: "referral" },
  { initials: "VS", name: "Vertex Systems", clients: 0, referredMrr: "$0", agreement: "2026-09", status: "churned", tier: "referral" },
];

/* ---------------------------------------------------------------------- */
/* Approval queue (PRD 6.3 step 3 — Finance/Admin reviews ledger entry)   */
/* ---------------------------------------------------------------------- */

export const approvalRows: ApprovalRow[] = [
  { partner: "Jeevant Global", client: "Client B", dealType: "upsell", revenue: "$11,800", commission: "$2,360", commissionPct: "20%" },
  { partner: "Jeevant Global", client: "Client A", dealType: "new_subscription", revenue: "$4,200", commission: "$840", commissionPct: "20%" },
  { partner: "Rashi Partners", client: "Client D", dealType: "renewal", revenue: "$2,100", commission: "$210", commissionPct: "10%" },
  { partner: "Rashi Partners", client: "Client E", dealType: "new_subscription", revenue: "$18,600", commission: "$3,720", commissionPct: "20%" },
];

export const batchRows: BatchRow[] = [
  { batch: "B-0142", period: "2026-08", total: "$12,940", status: "pending" },
  { batch: "B-0141", period: "2026-07", total: "$11,760", status: "paid" },
  { batch: "B-0140", period: "2026-06", total: "$10,980", status: "paid" },
];

/* ---------------------------------------------------------------------- */
/* Charts                                                                  */
/* ---------------------------------------------------------------------- */

export const dashForecastChart = {
  labels: ["Now", "1y", "2y", "3y", "4y", "5y"],
  data: [9940, 42600, 86000, 140000, 200000, 268000],
};

export const fullForecastChart = {
  labels: ["Now", "1y", "5y", "10y", "15y", "20y"],
  expected: [9940, 42600, 268000, 611000, 950000, 1400000],
  conservative: [9940, 35000, 180000, 380000, 560000, 780000],
};

export const liabilityChart = {
  labels: ["Mar", "Apr", "May", "Jun", "Jul", "Aug"],
  paid: [41000, 44000, 47000, 50000, 53000, 0],
  accrued: [3000, 3400, 3900, 4200, 4600, 98400],
};

/* ---------------------------------------------------------------------- */
/* Lead pipeline (PRD 5.4 — New -> Contacted -> Qualified -> Demo ->      */
/* Proposal -> Won / Lost)                                                */
/* ---------------------------------------------------------------------- */

export const leadStageLabels: Record<LeadStage, string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  demo: "Demo",
  proposal: "Proposal",
  won: "Won",
  lost: "Lost",
};

export const requirementOptions = [
  { value: "core_hr", label: "Core HR" },
  { value: "payroll", label: "Payroll" },
  { value: "recruitment", label: "Recruitment / ATS" },
  { value: "attendance_leave", label: "Attendance & Leave" },
  { value: "performance", label: "Performance Management" },
  { value: "full_suite", label: "Full HRMS Suite" },
  { value: "ai_addon", label: "AI Add-ons" },
  { value: "other", label: "Other" },
];
